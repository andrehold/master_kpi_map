// src/services/deribit.ts
// Global, rate-limited + cached Deribit REST client used across the app.
// Centralizes retries, timeouts, caching, and optional console debugging.

// ---------- Types ------------------------------------------------------------
export type Currency = "BTC" | "ETH";

export type DeribitInstrument = {
  instrument_name: string;
  is_active: boolean;
  kind: 'option' | 'future';
  option_type?: 'call' | 'put';
  expiration_timestamp: number; // ms
  strike?: number;
  tick_size?: number;
  settlement_period?: string;
  min_trade_amount?: number;
  quote_currency: string; // "USD"
  base_currency: string;  // "BTC" | "ETH"
};

export type DeribitTicker = {
  instrument_name: string;
  mark_iv?: number; // can be percent (45.8) or decimal (0.458)
  greeks?: { delta?: number; gamma?: number };
  best_bid_price?: number;
  best_ask_price?: number;
  last_price?: number;
  mark_price?: number;
};

export type DvolPoint = {
  ts: number;        // ms since epoch
  closePct: number;  // e.g., 45.8 means 45.8%
  openPct?: number;
  highPct?: number;
  lowPct?: number;
};

export type BookSummaryRow = {
  instrument_name: string;
  open_interest?: number;
  mark_price?: number | null;
  bid_price?: number | null;
  ask_price?: number | null;
  last_price?: number | null;
  mark_iv?: number | null;
  delta?: number | null;
};

export type IndexPriceMeta = { 
  price: number; 
  timestamp: number 
};

// Use Vite dev proxy in development to avoid CORS; fall back to absolute in prod
const DERIBIT = (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV)
  ? '/api/v2'
  : 'https://www.deribit.com/api/v2';

const indexTsStore = new Map<string, number>();
// ---------- Debug logging (toggle at runtime) --------------------------------
// Turn on in DevTools at any time:
//   window.__DERIBIT_DEBUG__ = true
// Or persist across reloads:
//   localStorage.setItem('deribitDebug','1')
function isDbg(): boolean {
  try {
    if (typeof window !== 'undefined') {
      if ((window as any).__DERIBIT_DEBUG__ === true) return true;
      if (localStorage.getItem('deribitDebug') === '1') return true;
    }
  } catch {}
  return false;
}
function dlog(...args: any[]) { if (isDbg()) try { console.log('[deribit]', ...args); } catch {} }
function dgroup(label: string, collapsed = true) {
  if (!isDbg()) return;
  try { (collapsed ? console.groupCollapsed : console.group).call(console, `[deribit] ${label}`); } catch {}
}
function dgroupEnd() { if (isDbg()) try { console.groupEnd(); } catch {} }

// ---------- Small utils ------------------------------------------------------
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// ---------- Rate limiter (global gate) ---------------------------------------
class RateGate {
  private maxPerSec: number;
  private concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];
  private starts: number[] = []; // request start timestamps (ms)
  private wakeTimer: any | null = null; // timer to re-check queue when blocked

  constructor(maxPerSec: number, concurrency: number) {
    this.maxPerSec = Math.max(1, maxPerSec);
    this.concurrency = Math.max(1, concurrency);
  }

  private canStart() {
    const now = Date.now();
    while (this.starts.length && now - this.starts[0] > 1000) this.starts.shift();
    return this.running < this.concurrency && this.starts.length < this.maxPerSec;
  }

  private tryStartNext() {
    dlog('gate: tryStartNext q=', this.queue.length, 'running=', this.running);
    if (!this.queue.length) return;
    if (!this.canStart()) {
      // If we're blocked by rate window or concurrency but have nothing running
      // to trigger the next check, schedule a wake-up to re-evaluate shortly.
      if (this.wakeTimer == null) {
        const delayMs = 150; // small heartbeat to drain the queue when tokens free up
        this.wakeTimer = setTimeout(() => {
          this.wakeTimer = null;
          this.tryStartNext();
        }, delayMs);
      }
      return;
    }
    const next = this.queue.shift()!;
    this.running++;
    this.starts.push(Date.now());
    dlog('gate: start task, running=', this.running);
    next();
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        } finally {
          this.running--;
          dlog('gate: end task, running=', this.running);
          this.tryStartNext();
        }
      };
      this.queue.push(run);
      dlog('gate: enqueued, q=', this.queue.length);
      this.tryStartNext();
    });
  }
}

// Conservative defaults for public REST
const limiter = new RateGate(/* maxPerSec */ 5, /* concurrency */ 2);

// ---------- Caches + inflight coalescing ------------------------------------
type CacheEntry<T> = { at: number; data: T };

const TICKER_TTL = 20_000;  // 20s
const INDEX_TTL  = 3_000;   // 3s
const INSTR_TTL  = 60_000;  // 60s

const tickerCache = new Map<string, CacheEntry<any>>();
const indexCache  = new Map<string, CacheEntry<number>>();
const instrCache  = new Map<string, CacheEntry<any>>();

// Single inflight registry for all keys to allow coalescing
const inflight = new Map<string, Promise<any>>();

// ---------- Low-level GET with timeout + retry/backoff ----------------------
export async function dget<T>(path: string, params: Record<string, any>) {
  const qs = new URLSearchParams(params as any).toString();
  const url = `${DERIBIT}${path}?${qs}`;

  dgroup(`dget ${path}`);
  dlog('params', params);

  return limiter.schedule(async () => {
    dlog('limiter: scheduled for', path);
    let delay = 250;
    for (let attempt = 1; attempt <= 4; attempt++) {
      dlog('fetch attempt', attempt);
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 12_000); // 12s timeout

      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (res.ok) {
          dlog('response', res.status, res.statusText);
          const json = await res.json();
          if (!json?.result) throw new Error('Deribit: empty result');
          return json.result as T;
        }
        const is429 = res.status === 429;
        if (attempt === 4 || !is429) {
          dlog('error', res.status, res.statusText);
          throw new Error(`Deribit error ${res.status}: ${res.statusText}`);
        }
        await sleep(delay);
        delay = Math.min(delay * 2, 2000);
      } catch (e: any) {
        // retry on network error or abort
        if (attempt === 4) throw e;
        await sleep(delay);
        delay = Math.min(delay * 2, 2000);
      } finally {
        clearTimeout(to);
      }
    }
    throw new Error('unreachable');
  }).finally(() => {
    dgroupEnd();
  });
}

// ---------- Public API wrappers (cached + coalesced) -------------------------
export async function getTicker(instrument_name: string) {
  dlog('getTicker called', instrument_name);
  const key = `ticker:${instrument_name}`;
  const now = Date.now();

  const cached = tickerCache.get(key);
  if (cached && now - cached.at < TICKER_TTL) {
    dlog('getTicker: cache hit', key);
    return cached.data;
  }
  const running = inflight.get(key);
  if (running) {
    dlog('getTicker: join inflight', key);
    return running;
  }

  dlog('getTicker: network fetch', key);
  const p = (async () => {
    try {
      const data = await dget<DeribitTicker>('/public/ticker', { instrument_name });
      tickerCache.set(key, { at: Date.now(), data });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

export async function getIndexPrice(currency: 'BTC' | 'ETH'): Promise<number> {
  dlog('getIndexPrice called', currency);
  const key = `index:${currency}`;
  const now = Date.now();

  const cached = indexCache.get(key);
  if (cached && now - cached.at < INDEX_TTL) {
    dlog('getIndexPrice: cache hit', key);
    // timestamp was recorded when we last fetched; leave it as-is on cache hit
    return cached.data as number;
  }

  const running = inflight.get(key) as Promise<number> | undefined;
  if (running) {
    dlog('getIndexPrice: join inflight', key);
    return running;
  }

  dlog('getIndexPrice: network fetch', key);
  const p = (async () => {
    try {
      const index_name = currency === 'BTC' ? 'btc_usd' : 'eth_usd';
      // dget returns the "result" payload from Deribit; include timestamp in the shape
      const r = await dget<{ index_price?: number; price?: number; timestamp?: number }>(
        '/public/get_index_price',
        { index_name }
      );

      const price = (r?.index_price ?? (r as any)?.price) as number | undefined;
      const ts = (r as any)?.timestamp ?? Date.now();

      if (typeof price !== 'number' || !isFinite(price)) {
        throw new Error('Invalid index_price response');
      }

      indexCache.set(key, { at: Date.now(), data: price });
      indexTsStore.set(key, ts); // record timestamp alongside the cached price
      return price;
    } catch (err) {
      if (cached) {
        dlog('getIndexPrice: serve stale after error', String(err));
        return cached.data as number;
      }
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

export async function getIndexPriceMeta(currency: 'BTC' | 'ETH'): Promise<IndexPriceMeta> {
  const key = `index:${currency}`;
  const price = await getIndexPrice(currency); // reuses cache/inflight & records timestamp
  const timestamp = indexTsStore.get(key) ?? Date.now(); // fallback just-in-case
  return { price, timestamp };
}

export async function getInstruments(currency: 'BTC' | 'ETH') {
  dlog('getInstruments: called');
  const key = `instr:${currency}`;
  const now = Date.now();

  const cached = instrCache.get(key);
  if (cached && now - cached.at < INSTR_TTL) {
    dlog('getInstruments: cache hit', key);
    return cached.data;
  }
  const running = inflight.get(key);
  if (running) {
    dlog('getInstruments: join inflight', key);
    return running;
  }

  dlog('getInstruments: network fetch', key);
  const p = (async () => {
    try {
      const result = await dget<{ instruments: DeribitInstrument[] }>(
        '/public/get_instruments',
        { currency, kind: 'option', expired: false }
      );
      const instruments = result as any as DeribitInstrument[];
      instrCache.set(key, { at: Date.now(), data: instruments });
      return instruments;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

export async function getBookSummaryByCurrency(
  currency: Currency | undefined
): Promise<Map<string, number>> {
  // 👇 robust default – never send "undefined" to Deribit
  const effective: Currency = currency ?? "BTC";

  const res = await dget<{ result?: BookSummaryRow[] }>(
    "/public/get_book_summary_by_currency",
    { currency: effective, kind: "option" }
  );

  const rows: BookSummaryRow[] = (res as any)?.result ?? (res as any) ?? [];
  const map = new Map<string, number>();

  for (const r of rows) {
    if (r && r.instrument_name && typeof r.open_interest === "number") {
      map.set(r.instrument_name, r.open_interest);
    }
  }

  return map;
}

export async function getOptionBookSummary(
  instrumentName: string
): Promise<BookSummaryRow> {
  const res = await dget<BookSummaryRow[]>(
    "/public/get_book_summary_by_instrument",
    { instrument_name: instrumentName }
  );
  if (!res?.length) {
    throw new Error(`No book summary for instrument ${instrumentName}`);
  }
  return res[0]; // now has mark_price, delta, etc.
}


// ---------- DVOL (volatility index) history ---------------------------------
/**
 * Fetch DVOL history for a currency.
 * @param currency 'BTC' | 'ETH'
 * @param limit number of points to fetch (approximate)
 * @param resolutionSec bar size in seconds (e.g., 60, 3600, 86400)
 * @returns array of { ts, closePct, openPct?, highPct?, lowPct? } sorted ascending
 */
export async function fetchDvolHistory(
  currency: 'BTC' | 'ETH',
  limit = 400,
  resolutionSec = 86400
): Promise<DvolPoint[]> {
  dlog('fetchDvolHistory called', currency, { limit, resolutionSec });

  const end = Date.now();
  const start = end - Math.max(1, limit) * Math.max(60, resolutionSec) * 1000;
  async function load(resSec: number) {
    return dget<{ data: [number, number, number, number, number][] }>(
      '/public/get_volatility_index_data',
      { currency, start_timestamp: start, end_timestamp: end, resolution: Math.max(60, resSec) }
    );
  }

  let result: any;
  try {
    result = await load(resolutionSec);
  } catch (e) {
    // Fallback to hourly if minute resolution fails (e.g., rate/limits)
    if (resolutionSec < 3600) {
      result = await load(3600);
    } else {
      throw e;
    }
  }

  const rows = (result as any).data ?? [];
  const toPct = (v: number | undefined) =>
    typeof v === 'number' ? (v < 1 ? v * 100 : v) : undefined;

  const out: DvolPoint[] = rows
    .map(([ts, open, high, low, close]) => ({
      ts,
      closePct: toPct(close)!,
      openPct: toPct(open),
      highPct: toPct(high),
      lowPct: toPct(low),
    }))
    .filter(p => Number.isFinite(p.ts) && Number.isFinite(p.closePct as any))
    .sort((a, b) => a.ts - b.ts);

  if (out.length > limit) return out.slice(out.length - limit);
  return out;
}

// ---------- TradingView-style price history (PERPETUAL proxy for spot) -------
export type PriceCandle = { ts: number; open?: number; high?: number; low?: number; close: number; volume?: number };

/** Fetch close prices for PERPETUAL future as spot proxy. */
export async function fetchPerpHistory(
  currency: 'BTC' | 'ETH',
  limit = 400,
  resolutionSec = 86400
): Promise<PriceCandle[]> {
  const instrument_name = currency === 'BTC' ? 'BTC-PERPETUAL' : 'ETH-PERPETUAL';
  const end = Math.floor(Date.now() / 1000) * 1000; // ms
  const start = end - Math.max(1, limit) * Math.max(60, resolutionSec) * 1000;

  // Deribit returns either arrays (data rows) or TradingView vectors; handle both
  // TradingView API expects resolution as minutes string or 'D','W','M'. Use 'D' for >= 1 day.
  const resolution = resolutionSec >= 86400
    ? 'D'
    : String(Math.max(1, Math.floor(resolutionSec / 60)));

  const result = await dget<any>('/public/get_tradingview_chart_data', {
    instrument_name,
    start_timestamp: start,
    end_timestamp: end,
    resolution
  });

  // Shape A: { data: [[ts, open, high, low, close, volume], ...] }
  if (Array.isArray(result?.data)) {
    return (result.data as any[])
      .map((row: any[]) => ({ ts: row[0], open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5] }))
      .filter(p => Number.isFinite(p.ts) && Number.isFinite(p.close as any))
      .sort((a, b) => a.ts - b.ts)
      .slice(-limit);
  }

  // Shape B: TradingView vectors { ticks, open, high, low, close, volume }
  const ticks: number[] = result?.ticks || result?.t || [];
  const close: number[] = result?.close || result?.c || [];
  const open: number[] = result?.open || result?.o || [];
  const high: number[] = result?.high || result?.h || [];
  const low: number[] = result?.low || result?.l || [];
  const volume: number[] = result?.volume || result?.v || [];

  const out: PriceCandle[] = [];
  for (let i = 0; i < Math.min(ticks.length, close.length); i++) {
    out.push({ ts: ticks[i], open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] });
  }
  return out
    .filter(p => Number.isFinite(p.ts) && Number.isFinite(p.close as any))
    .sort((a, b) => a.ts - b.ts)
    .slice(-limit);
}

// ---------- Additional Helper -------

export async function getContractSize(instrument_name: string): Promise<number> {
  try {
    const r = await dget<{ contract_size?: number }>(
      '/public/get_contract_size',
      { instrument_name }
    );
    const cs = (r as any)?.contract_size;
    return (typeof cs === 'number' && isFinite(cs) && cs > 0) ? cs : 1;
  } catch {
    return 1; // Deribit options are effectively 1 underlying per contract
  }
}