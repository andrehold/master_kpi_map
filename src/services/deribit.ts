// --- Types -------------------------------------------------------------

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
  mark_iv?: number; // IV as decimal (e.g. 0.62 for 62%)
  greeks?: { delta?: number };
};

export type BookSummary = {
  instrument_name: string;
  mark_iv?: number;        // e.g. 0.55 = 55%
  mark_price?: number;
  underlying_price?: number;
  interest_rate?: number;
};

export type ATMSelection = {
  expiryTs: number;
  expiryISO: string;
  strike: number;
  call?: string; // instrument_name for call
  put?: string;  // instrument_name for put
};

export type IVPoint = {
  expiryISO: string;
  dte: number;       // days to expiry (rounded)
  ttmY: number;      // time to maturity in years
  strike: number;
  iv: number | null; // averaged C/P mark_iv, or single-sided, or null if none
  call?: string;
  put?: string;
};

export type DvolCandle = [ts: number, open: number, high: number, low: number, close: number];

const DERIBIT = "https://www.deribit.com/api/v2";

function isoDate(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(url, { cache: "no-store", signal });
  if (!r.ok) throw new Error(`${url} -> ${r.status} ${r.statusText}`);
  const j = await r.json();
  if (j?.error) throw new Error(`Deribit error: ${JSON.stringify(j.error)}`);
  return j.result as T;
}

async function dget<T>(path: string, params: Record<string, any>) {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${DERIBIT}${path}?${qs}`);
  if (!res.ok) throw new Error(`Deribit error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (!json?.result) throw new Error('Deribit: empty result');
  return json.result as T;
}

export async function getInstruments(currency: 'BTC' | 'ETH') {
  // Only active options, non-expired
  return dget<{ instruments: DeribitInstrument[] }>(
    '/public/get_instruments',
    { currency, kind: 'option', expired: false }
  ).then(r => r as any as DeribitInstrument[]);
}

export async function getTicker(instrument_name: string) {
  return dget<DeribitTicker>('/public/ticker', { instrument_name });
}

/** NEW: currency-aware instruments */
export async function getActiveOptionInstruments(
  currency: "BTC" | "ETH",
  signal?: AbortSignal
): Promise<DeribitInstrument[]> {
  const url = `${DERIBIT}/public/get_instruments?currency=${currency}&kind=option&expired=false`;
  return fetchJSON<DeribitInstrument[]>(url, signal);
}

/** NEW: currency-aware index price */
export async function getIndexPrice(
  currency: "BTC" | "ETH",
  signal?: AbortSignal
): Promise<number> {
  const idx = `${currency.toLowerCase()}_usd`; // btc_usd / eth_usd
  const url = `${DERIBIT}/public/get_index_price?index_name=${idx}`;
  const res = await fetchJSON<{ index_price: number }>(url, signal);
  return res.index_price;
}

/** Group by expiry and keep only strikes near ATM */
export function groupByExpiryNearATM(
  instruments: DeribitInstrument[],
  indexPrice: number,
  opts: { perExpiry?: number; bandPct?: number; maxExpiries?: number } = {}
) {
  const { perExpiry = 5, bandPct = 0.07, maxExpiries = 8 } = opts;
  const now = Date.now();
  const buckets = new Map<number, DeribitInstrument[]>();

  for (const inst of instruments) {
    if (!inst.is_active || !inst.expiration_timestamp || !inst.strike) continue;
    if (inst.expiration_timestamp - now <= 12 * 60 * 60 * 1000) continue; // skip expiring ~today
    const arr = buckets.get(inst.expiration_timestamp) || [];
    arr.push(inst);
    buckets.set(inst.expiration_timestamp, arr);
  }

  const expiries = Array.from(buckets.keys()).sort((a, b) => a - b).slice(0, maxExpiries);

  return expiries.map(ts => {
    const all = buckets.get(ts)!;
    const bandLo = indexPrice * (1 - bandPct);
    const bandHi = indexPrice * (1 + bandPct);

    const near = all
      .filter(i => (i.strike ?? 0) >= bandLo && (i.strike ?? 0) <= bandHi)
      .map(i => ({ i, d: Math.abs((i.strike ?? 0) - indexPrice) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, perExpiry)
      .map(x => x.i);

    return {
      expiryTs: ts,
      expiryISO: new Date(ts).toISOString().slice(0, 10),
      instruments: near,
    };
  }).filter(g => g.instruments.length > 0);
}

// Fetch mark_iv for a single option instrument
export async function getBookSummary(instrument_name: string, signal?: AbortSignal): Promise<BookSummary | null> {
  const url = `${DERIBIT}/public/get_book_summary_by_instrument?instrument_name=${encodeURIComponent(instrument_name)}`;
  const arr = await fetchJSON<BookSummary[]>(url, signal);
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

/**
 * Pick ATM per expiry: choose strike closest to index; try to pair both call & put.
 * Options:
 *  - maxExpiries: cap number of expiries (default 6)
 *  - bandPct: optionally ignore strikes outside ±band% of index (default undefined => no band)
 *  - minDteHours: skip expiries expiring within this many hours (default 12)
 */
export function pickATMPerExpiry(
  instruments: DeribitInstrument[],
  indexPrice: number,
  opts: { maxExpiries?: number; bandPct?: number; minDteHours?: number } = {}
): ATMSelection[] {
  const { maxExpiries = 6, bandPct, minDteHours = 12 } = opts;

  const now = Date.now();
  const byExpiry = new Map<number, DeribitInstrument[]>();

  for (const inst of instruments) {
    if (!inst.is_active || inst.kind !== "option") continue;
    if (!inst.expiration_timestamp || !inst.strike) continue;
    if (inst.expiration_timestamp - now <= (minDteHours * 60 * 60 * 1000)) continue;

    if (bandPct != null && bandPct > 0) {
      const lo = indexPrice * (1 - bandPct);
      const hi = indexPrice * (1 + bandPct);
      if (inst.strike < lo || inst.strike > hi) continue;
    }

    const arr = byExpiry.get(inst.expiration_timestamp) || [];
    arr.push(inst);
    byExpiry.set(inst.expiration_timestamp, arr);
  }

  const expiries = Array.from(byExpiry.keys()).sort((a, b) => a - b).slice(0, maxExpiries);

  const out: ATMSelection[] = [];
  for (const ts of expiries) {
    const bucket = byExpiry.get(ts)!;

    // nearest strike overall
    const nearest = bucket.reduce<{ inst: DeribitInstrument | null; diff: number }>((best, inst) => {
      const diff = Math.abs((inst.strike ?? Infinity) - indexPrice);
      return diff < best.diff ? { inst, diff } : best;
    }, { inst: null, diff: Infinity }).inst;

    if (!nearest || !nearest.strike) continue;
    const target = nearest.strike;

    // try exact same-strike call & put
    const callExact = bucket.find(i => i.option_type === "call" && i.strike === target);
    const putExact  = bucket.find(i => i.option_type === "put"  && i.strike === target);

    // fallback: nearest call & nearest put individually
    const callFallback = bucket
      .filter(i => i.option_type === "call")
      .reduce((best: { inst?: DeribitInstrument; d: number }, i) => {
        const d = Math.abs((i.strike ?? 0) - indexPrice);
        return d < (best.d ?? Infinity) ? { inst: i, d } : best;
      }, { d: Infinity }).inst;

    const putFallback = bucket
      .filter(i => i.option_type === "put")
      .reduce((best: { inst?: DeribitInstrument; d: number }, i) => {
        const d = Math.abs((i.strike ?? 0) - indexPrice);
        return d < (best.d ?? Infinity) ? { inst: i, d } : best;
      }, { d: Infinity }).inst;

    const call = (callExact ?? callFallback)?.instrument_name;
    const put  = (putExact  ?? putFallback )?.instrument_name;

    out.push({
      expiryTs: ts,
      expiryISO: isoDate(ts),
      strike: target,
      call,
      put,
    });
  }

  return out;
}

/**
 * High-level: fetch active instruments + index, choose ATM per expiry,
 * fetch mark_iv for C/P, average them, and produce IV vs DTE points.
 */
export async function getATMIVPoints(
  currency: "BTC" | "ETH",
  opts: { maxExpiries?: number; bandPct?: number; minDteHours?: number } = {},
  signal?: AbortSignal
): Promise<{ asOf: string; currency: "BTC" | "ETH"; indexPrice: number; points: IVPoint[] }> {
  const [instruments, indexPrice] = await Promise.all([
    getActiveOptionInstruments(currency, signal),
    getIndexPrice(currency, signal),
  ]);

  const selections = pickATMPerExpiry(instruments, indexPrice, opts);
  const now = Date.now();

  // fetch book summaries in parallel
  const fetches: Array<Promise<{ key: string; bs: BookSummary | null }>> = [];
  for (const s of selections) {
    if (s.call) fetches.push(getBookSummary(s.call, signal).then(bs => ({ key: `C:${s.expiryISO}`, bs })));
    if (s.put)  fetches.push(getBookSummary(s.put,  signal).then(bs => ({ key: `P:${s.expiryISO}`, bs })));
  }
  const results = await Promise.all(fetches);

  // organize summaries by expiry and side
  const map = new Map<string, { C?: BookSummary | null; P?: BookSummary | null }>();
  for (const r of results) {
    const [side, iso] = r.key.split(":");
    const entry = map.get(iso) ?? {};
    (entry as any)[side] = r.bs;
    map.set(iso, entry);
  }

  const points: IVPoint[] = [];
  for (const s of selections) {
    const dte = Math.max(0, Math.round((s.expiryTs - now) / (1000 * 60 * 60 * 24)));
    const ttmY = dte / 365;
    const pair = map.get(s.expiryISO) ?? {};
    // Deribit 'mark_iv' is in PERCENT units (e.g., 50 = 50%), convert to decimal.
    const ivsPct = [pair.C?.mark_iv, pair.P?.mark_iv].filter((v): v is number => typeof v === "number" && isFinite(v));
    const ivsDec = ivsPct.map(v => v / 100);

    points.push({
      expiryISO: s.expiryISO,
      dte,
      ttmY,
      strike: s.strike,
      iv: ivsDec.length ? ivsDec.reduce((a, b) => a + b, 0) / ivsDec.length : null,
      call: s.call,
      put: s.put,
    });
  }

  // keep only points where we found at least one IV
  const usable = points.filter(p => p.iv !== null).sort((a, b) => a.dte - b.dte);

  return {
    asOf: new Date().toISOString(),
    currency,
    indexPrice,
    points: usable,
  };
}

function normalizeVol(v: number): number {
  // DVOL may come as 0.45 (45%) or 45.0 (%). Normalize to percent.
  return v < 1 ? v * 100 : v;
}

/** Latest DVOL close over a small recent window (minutes→hours). */
export async function fetchDvolLatest(
  currency: "BTC" | "ETH" = "BTC",
  resolutionSec: 60 | 3600 = 60
): Promise<{ valuePct: number; ts: number }> {
  const now = Date.now();
  const start = now - 6 * 60 * 60 * 1000;
  const url = `/api/v2/public/get_volatility_index_data?currency=${currency}&start_timestamp=${start}&end_timestamp=${now}&resolution=${resolutionSec}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deribit HTTP ${res.status}`);
  const json = await res.json();
  const rows: DvolCandle[] = json?.result?.data ?? [];
  if (!rows.length) throw new Error("No DVOL data");
  const [ts, , , , close] = rows[rows.length - 1];
  return { valuePct: normalizeVol(close), ts };
}

/** DVOL history for IVR/IVP (default ~400 days @ daily). */
export async function fetchDvolHistory(
  currency: "BTC" | "ETH" = "BTC",
  days = 400,
  resolutionSec = 86400 // daily
): Promise<Array<{ ts: number; closePct: number }>> {
  const end = Date.now();
  const start = end - days * 24 * 60 * 60 * 1000;
  const url = `/api/v2/public/get_volatility_index_data?currency=${currency}&start_timestamp=${start}&end_timestamp=${end}&resolution=${resolutionSec}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deribit HTTP ${res.status}`);
  const json = await res.json();
  const rows: DvolCandle[] = json?.result?.data ?? [];
  return rows.map(([ts, , , , close]) => ({ ts, closePct: normalizeVol(close) }));
}
