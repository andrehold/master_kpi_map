// src/hooks/useDeribitSkew25D.ts
import { useEffect, useMemo, useState } from 'react';
import { getInstruments, getTicker, DeribitInstrument } from '../services/deribit';

type SkewState = {
  loading: boolean;
  error?: string;
  skew?: number;       // RR = ivC25 - ivP25
  ivC25?: number;
  ivP25?: number;
  expiryTs?: number;   // ms
  expiryLabel?: string;
  callSource?: string; // instrument name used for interpolation
  putSource?: string;
};

type Options = {
  currency?: 'BTC' | 'ETH';
  targetDays?: number; // default 30
  maxTickers?: number; // safety cap (default 120)
};

type WithGreeks = {
  name: string;
  delta: number;
  iv: number;
};

function toDateLabel(ts: number | undefined) {
  if (!ts) return undefined;
  const d = new Date(ts);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function interpolateByDelta(sorted: WithGreeks[], target: number): { iv: number, a: string, b?: string } | undefined {
  if (!sorted.length) return undefined;
  // ensure sort ascending by delta
  sorted.sort((x, y) => x.delta - y.delta);

  // if outside bounds, clamp
  if (target <= sorted[0].delta) return { iv: sorted[0].iv, a: sorted[0].name };
  if (target >= sorted[sorted.length - 1].delta) {
    const last = sorted[sorted.length - 1];
    return { iv: last.iv, a: last.name };
  }

  // find bracket
  const idx = sorted.findIndex(x => x.delta >= target);
  if (idx <= 0) {
    return { iv: sorted[0].iv, a: sorted[0].name };
  }
  const left = sorted[idx - 1];
  const right = sorted[idx];
  const t = (target - left.delta) / (right.delta - left.delta || 1);
  const iv = left.iv + t * (right.iv - left.iv);
  return { iv, a: left.name, b: right.name };
}

export function useDeribitSkew25D(opts: Options = {}) {
  const { currency = 'BTC', targetDays = 30, maxTickers = 120 } = opts;
  const [state, setState] = useState<SkewState>({ loading: true });

  // --- added: refresh index for external refresh
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
          const tteDays = (ins.expiration_timestamp - now) / (86400e3);
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

        // fetch tickers, capped to avoid hammering
        const chosen = series.slice(0, Math.min(series.length, maxTickers));
        const tickers = await Promise.all(chosen.map(i => getTicker(i.instrument_name).catch(() => undefined)));

        // extract greeks + iv
        const calls: WithGreeks[] = [];
        const puts: WithGreeks[] = [];
        for (let i = 0; i < chosen.length; i++) {
          const ins = chosen[i];
          const tk = tickers[i];
          const delta = tk?.greeks?.delta;
          const iv = tk?.mark_iv;
          if (typeof delta !== 'number' || typeof iv !== 'number' || !isFinite(delta) || !isFinite(iv)) continue;
          const row = { name: ins.instrument_name, delta, iv };
          if (ins.option_type === 'call') calls.push(row);
          else if (ins.option_type === 'put') puts.push(row);
        }

        if (!calls.length || !puts.length) throw new Error('Missing call/put data for selected expiry.');

        // interpolate to +0.25 for calls and -0.25 for puts
        const call25 = interpolateByDelta(calls, 0.25);
        const put25  = interpolateByDelta(puts, -0.25);

        if (!call25 || !put25) throw new Error('Could not interpolate to 25Δ.');

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
  }, [currency, targetDays, maxTickers, refreshIndex]); // Added refreshIndex

  // --- changed: return state + refresh
  return useMemo(() => ({
    ...state,
    refresh: () => setRefreshIndex((i) => i + 1)
  }), [state]);
}
