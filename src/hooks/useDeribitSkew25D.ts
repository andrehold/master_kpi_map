// src/hooks/useDeribitSkew25D.ts
import { useEffect, useMemo, useState } from 'react';
import { getInstruments, getTicker, getIndexPrice, DeribitInstrument } from '../services/deribit';

// --- Helpers & defaults ------------------------------------------------------
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const DEFAULTS = {
  currency: 'BTC' as const,
  targetDays: 30,
  maxPerSide: 15,   // number of strikes per side (calls/puts) to query near ATM
  concurrency: 4,   // concurrent ticker requests
  retries: 4,       // retry attempts on 429
};

type SkewState = {
  loading: boolean;
  error?: string;
  skew?: number;       // RR = ivC25 - ivP25, in decimals (e.g., 0.0123 => 1.23 vol pts)
  ivC25?: number;      // decimal (e.g., 0.458)
  ivP25?: number;      // decimal
  expiryTs?: number;   // ms
  expiryLabel?: string;
  callSource?: string; // instrument name used for interpolation
  putSource?: string;
};

type Options = {
  currency?: 'BTC' | 'ETH';
  targetDays?: number;
  maxPerSide?: number;   // limit how many calls and puts we fetch (per side)
  concurrency?: number;  // how many tickers to fetch in parallel
  retries?: number;      // how many times to retry on 429
};

type WithGreeks = {
  name: string;
  delta: number;
  iv: number;
};

async function tickerWithRetry(instrument: string, tries = 4) {
  let delay = 250;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await getTicker(instrument);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const is429 = msg.includes('429') || msg.toLowerCase().includes('too many requests');
      if (attempt === tries) throw e;
      await sleep(is429 ? delay : 200);
      if (is429) delay = Math.min(delay * 2, 2000);
    }
  }
  // unreachable (TypeScript happy)
  throw new Error('tickerWithRetry: exhausted attempts');
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (t: T, idx: number) => Promise<U>
): Promise<U[]> {
  const results = new Array<U>(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// Normalize Deribit mark_iv (sometimes % like 45.8) to decimal (0.458)
function asDecimalIv(x?: number) {
  if (typeof x !== 'number' || !isFinite(x)) return undefined as any;
  return x > 1 ? x / 100 : x;
}

function toDateLabel(ts: number | undefined) {
  if (!ts) return undefined;
  const d = new Date(ts);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Linear interpolation in delta-space; returns bracket span too
function interpolateByDelta(
  sorted: WithGreeks[],
  target: number
): { iv: number; a: string; b?: string; span?: number } | undefined {
  if (!sorted.length) return undefined;
  sorted.sort((x, y) => x.delta - y.delta);

  if (target <= sorted[0].delta) return { iv: sorted[0].iv, a: sorted[0].name };
  if (target >= sorted[sorted.length - 1].delta) {
    const last = sorted[sorted.length - 1];
    return { iv: last.iv, a: last.name };
  }

  const idx = sorted.findIndex(x => x.delta >= target);
  if (idx <= 0) return { iv: sorted[0].iv, a: sorted[0].name };

  const left = sorted[idx - 1];
  const right = sorted[idx];
  const span = Math.abs(right.delta - left.delta);
  const t = (target - left.delta) / (right.delta - left.delta || 1);
  const iv = left.iv + t * (right.iv - left.iv);
  return { iv, a: left.name, b: right.name, span };
}

function nearestByDelta(rows: WithGreeks[], target: number): { iv: number; a: string } | undefined {
  if (!rows.length) return undefined;
  let best = rows[0];
  let bestDist = Math.abs(rows[0].delta - target);
  for (let i = 1; i < rows.length; i++) {
    const d = Math.abs(rows[i].delta - target);
    if (d < bestDist) { best = rows[i]; bestDist = d; }
  }
  return { iv: best.iv, a: best.name };
}

function usedClamping(x?: { iv: number; a: string; b?: string }) {
  return !!(x && !x.b);
}

// --- Hook --------------------------------------------------------------------
export function useDeribitSkew25D(opts: Options = {}) {
  const {
    currency = DEFAULTS.currency,
    targetDays = DEFAULTS.targetDays,
    maxPerSide = DEFAULTS.maxPerSide,
    concurrency = DEFAULTS.concurrency,
    retries = DEFAULTS.retries,
  } = opts;

  const [state, setState] = useState<SkewState>({ loading: true });
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setState({ loading: true });

        const instruments = await getInstruments(currency);

        // group instruments by expiry
        const now = Date.now();
        const groups = new Map<number, DeribitInstrument[]>();
        for (const ins of instruments) {
          if (!ins.is_active || ins.kind !== 'option') continue;
          const tteDays = (ins.expiration_timestamp - now) / 86400e3;
          if (tteDays <= 1) continue; // skip ultra-near expiry
          if (!groups.has(ins.expiration_timestamp)) groups.set(ins.expiration_timestamp, []);
          groups.get(ins.expiration_timestamp)!.push(ins);
        }
        if (groups.size === 0) throw new Error('No active option expiries found.');

        // pick expiry closest to targetDays
        const target = targetDays;
        let bestTs = Array.from(groups.keys())[0];
        let bestErr = Math.abs((bestTs - now) / 86400e3 - target);
        for (const ts of groups.keys()) {
          const err = Math.abs((ts - now) / 86400e3 - target);
          if (err < bestErr) { bestErr = err; bestTs = ts; }
        }
        const series = groups.get(bestTs)!;

        // Center selection around ATM by strike and cap per side
        const spot = await getIndexPrice(currency as 'BTC' | 'ETH');

        const callsSeries = series.filter(i => i.option_type === 'call' && typeof i.strike === 'number');
        const putsSeries  = series.filter(i => i.option_type === 'put'  && typeof i.strike === 'number');

        callsSeries.sort((a, b) => Math.abs((a.strike! - spot)) - Math.abs((b.strike! - spot)));
        putsSeries.sort((a, b)  => Math.abs((a.strike! - spot)) - Math.abs((b.strike! - spot)));

        const chosenCalls = callsSeries.slice(0, Math.min(maxPerSide, callsSeries.length));
        const chosenPuts  = putsSeries.slice(0, Math.min(maxPerSide,  putsSeries.length));
        const chosen = [...chosenCalls, ...chosenPuts];

        // fetch tickers with limited concurrency and retries
        const tickers = await mapWithConcurrency(
          chosen,
          concurrency,
          (i) => tickerWithRetry(i.instrument_name, retries).catch(() => undefined as any)
        );

        // extract greeks + iv (normalized) and keep only OTM deltas
        const calls: WithGreeks[] = [];
        const puts:  WithGreeks[] = [];
        for (let i = 0; i < chosen.length; i++) {
          const ins = chosen[i];
          const tk = tickers[i];

          const delta = tk?.greeks?.delta;
          const iv = asDecimalIv(tk?.mark_iv);

          // basic sanity
          if (typeof delta !== 'number' || typeof iv !== 'number' || !isFinite(delta) || !isFinite(iv)) continue;
          if (iv <= 0 || iv > 3) continue; // drop obviously broken IVs (>300%)

          const row = { name: ins.instrument_name, delta, iv };
          if (ins.option_type === 'call') {
            // OTM calls only: 0 < Δ ≤ 0.5
            if (delta > 0 && delta <= 0.5) calls.push(row);
          } else if (ins.option_type === 'put') {
            // OTM puts only: -0.5 ≤ Δ < 0
            if (delta < 0 && delta >= -0.5) puts.push(row);
          }
        }

        if (!calls.length || !puts.length) throw new Error('Missing call/put data for selected expiry.');

        // interpolate to +0.25 for calls and -0.25 for puts
        let call25 = interpolateByDelta(calls, 0.25);
        let put25  = interpolateByDelta(puts, -0.25);
        if (!call25 || !put25) throw new Error('Could not interpolate to 25Δ.');

        // fallback if clamped or bracket too wide
        const TOO_WIDE = 0.12; // delta span threshold
        if (usedClamping(call25) || (call25.span ?? 0) > TOO_WIDE) {
          const alt = nearestByDelta(calls, 0.25);
          if (alt) call25 = { iv: alt.iv, a: alt.a };
        }
        if (usedClamping(put25) || (put25.span ?? 0) > TOO_WIDE) {
          const alt = nearestByDelta(puts, -0.25);
          if (alt) put25 = { iv: alt.iv, a: alt.a };
        }

        const skew = call25.iv - put25.iv; // RR definition
        if (cancelled) return;
        setState({
          loading: false,
          skew,
          ivC25: call25.iv,
          ivP25: put25.iv,
          expiryTs: bestTs,
          expiryLabel: toDateLabel(bestTs),
          callSource: call25.b ? `${call25.a} / ${call25.b}` : call25.a,
          putSource: put25.b ? `${put25.a} / ${put25.b}` : put25.a,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState({ loading: false, error: e?.message || String(e) });
      }
    }

    run();
    return () => { cancelled = true; };
  }, [currency, targetDays, maxPerSide, concurrency, retries, refreshIndex]);

  // expose a refresh method to the UI
  return useMemo(() => ({
    ...state,
    refresh: () => setRefreshIndex((i) => i + 1),
  }), [state]);
}
