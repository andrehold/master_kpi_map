// src/services/deribit.ts
// Global rate-limited + cached Deribit REST client used across the app.
// Provides thin API wrappers and centralizes 429/backoff handling.

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
  mark_iv?: number; // IV, may come as % (e.g. 45.8) or decimal (0.458)
  greeks?: { delta?: number };
  best_bid_price?: number;
  best_ask_price?: number;
  last_price?: number;
};

export type DvolPoint = {
  ts: number;        // ms
  closePct: number;  // e.g., 45.8 means 45.8%
  openPct?: number;
  highPct?: number;
  lowPct?: number;
};

const DERIBIT = 'https://www.deribit.com/api/v2';

// ---- Rate limit + caching primitives ----------------------------------------
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

class RateGate {
  private maxPerSec: number;
  private concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];
  private starts: number[] = []; // timestamps of task starts in the last 1s

  constructor(maxPerSec: number, concurrency: number) {
    this.maxPerSec = Math.max(1, maxPerSec);
    this.concurrency = Math.max(1, concurrency);
  }

  private canStart() {
    const now = Date.now();
    // prune start times older than 1s
    while (this.starts.length && now - this.starts[0] > 1000) this.starts.shift();
    return this.running < this.concurrency && this.starts.length < this.maxPerSec;
  }

  private tryStartNext() {
    if (!this.queue.length) return;
    if (!this.canStart()) return;
    const next = this.queue.shift()!;
    this.running++;
    this.starts.push(Date.now());
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
          this.tryStartNext();
        }
      };
      this.queue.push(run);
      this.tryStartNext();
    });
  }
}

// Tune conservatively for public REST. Adjust if needed.
const limiter = new RateGate(/* maxPerSec */ 5, /* concurrency */ 2);

// Simple caches (with in-flight coalescing) to avoid duplicate hits.
type CacheEntry<T> = { at: number; data: T };

const TICKER_TTL = 20_000;  // 20s
const INDEX_TTL  = 3_000;   // 3s
const INSTR_TTL  = 60_000;  // 60s

const tickerCache = new Map<string, CacheEntry<any>>();
const inflight    = new Map<string, Promise<any>>();
const indexCache  = new Map<string, CacheEntry<number>>();
const instrCache  = new Map<string, CacheEntry<any>>();

// ---- Low-level GET with limiter + retry/backoff -----------------------------
async function dget<T>(path: string, params: Record<string, any>) {
  const qs = new URLSearchParams(params as any).toString();
  const url = `${DERIBIT}${path}?${qs}`;

  return limiter.schedule(async () => {
    let delay = 250;
    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (!json?.result) throw new Error('Deribit: empty result');
        return json.result as T;
      }
      const is429 = res.status === 429;
      if (attempt === 4 || !is429) {
        throw new Error(`Deribit error ${res.status}: ${res.statusText}`);
      }
      await sleep(delay);
      delay = Math.min(delay * 2, 2000);
    }
    throw new Error('unreachable');
  });
}

// ---- Public API wrappers (cached) -------------------------------------------
export async function getTicker(instrument_name: string) {
  const key = `ticker:${instrument_name}`;
  const now = Date.now();

  const cached = tickerCache.get(key);
  if (cached && now - cached.at < TICKER_TTL) return cached.data;

  const running = inflight.get(key);
  if (running) return running;

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

export async function getIndexPrice(currency: 'BTC' | 'ETH') {
  const key = `index:${currency}`;
  const now = Date.now();
  const cached = indexCache.get(key);
  if (cached && now - cached.at < INDEX_TTL) return cached.data;

  // Deribit index names are lowercase with underscore, e.g., btc_usd / eth_usd
  const index_name = currency === 'BTC' ? 'btc_usd' : 'eth_usd';
  const r = await dget<{ index_price: number }>('/public/get_index_price', { index_name });
  const price = (r as any).index_price as number;

  indexCache.set(key, { at: Date.now(), data: price });
  return price;
}

export async function getInstruments(currency: 'BTC' | 'ETH') {
  const key = `instr:${currency}`;
  const now = Date.now();
  const cached = instrCache.get(key);
  if (cached && now - cached.at < INSTR_TTL) return cached.data;

  const result = await dget<{ instruments: DeribitInstrument[] }>(
    '/public/get_instruments',
    { currency, kind: 'option', expired: false }
  );
  const instruments = result as any as DeribitInstrument[];

  instrCache.set(key, { at: Date.now(), data: instruments });
  return instruments;
}

// DVOL history (percent units), normalized and lightweight typed

// Implementation must follow the declaration immediately to satisfy TS.
export async function fetchDvolHistory(
  currency: 'BTC' | 'ETH',
  limit = 400,
  resolutionSec = 86400
): Promise<DvolPoint[]> {
  const end = Date.now();
  const start = end - limit * 24 * 60 * 60 * 1000;

  // Deribit returns DVOL candles as [ts, open, high, low, close]
  const result = await dget<{ data: [number, number, number, number, number][] }>(
    '/public/get_volatility_index_data',
    {
      currency,
      start_timestamp: start,
      end_timestamp: end,
      resolution: resolutionSec,
    }
  );

  const rows = (result as any).data ?? [];

  const toPct = (v: number | undefined) =>
    typeof v === 'number' ? (v < 1 ? v * 100 : v) : undefined;

  return rows.map(([ts, open, high, low, close]) => ({
    ts,
    closePct: toPct(close)!,
    openPct: toPct(open),
    highPct: toPct(high),
    lowPct: toPct(low),
  }));
}
