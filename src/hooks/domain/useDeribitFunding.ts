// src/hooks/useDeribitFunding.ts
import { useEffect, useState, useCallback } from "react";
import { dget } from "../../services/deribit"; // adjust if your helper is elsewhere

type AnyPoint = {
  timestamp?: number; // ms epoch
  interest_1h?: number;
  interest_8h?: number;
  funding_rate?: number;
  rate_1h?: number;
  rate_8h?: number;
  [k: string]: any;
};

type FundingState = {
  current8h?: number;   // decimal per 8h (e.g., 0.0005 => 0.05%)
  avg7d8h?: number;     // decimal (last 7d)
  zScore?: number;      // unitless (lookback window)
  zLookbackDays?: number;
  updatedAt?: number;   // ms
  ts?: number;          // alias for updatedAt (keeps cards simple)
  loading: boolean;
  error?: string;
};

const DEBUG = true;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_Z_LOOKBACK_DAYS = 30;
const MIN_Z_POINTS = 10; // don't compute z on tiny samples

function rollingSumN(arr: number[], n: number): number[] {
  const out: number[] = [];
  let sum = 0;
  let q: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    q.push(arr[i]);
    sum += arr[i];
    if (q.length > n) sum -= q.shift()!;
    if (q.length === n) out.push(sum);
  }
  return out;
}

function normalizeFundingArray(resp: any): AnyPoint[] {
  const r = resp?.result ?? resp;
  if (Array.isArray(r)) return r as AnyPoint[];
  if (Array.isArray(r?.data)) return r.data as AnyPoint[];
  if (Array.isArray(r?.records)) return r.records as AnyPoint[];
  if (Array.isArray(r?.funding_rate_history)) {
    return (r.funding_rate_history as any[]).map((x) => ({
      timestamp: x?.timestamp,
      funding_rate: x?.funding_rate,
    }));
  }
  return [];
}

function read8h(p: AnyPoint): number | undefined {
  const v =
    (typeof p.interest_8h === "number" ? p.interest_8h : undefined) ??
    (typeof p.rate_8h === "number" ? p.rate_8h : undefined) ??
    (typeof p.funding_rate === "number" ? p.funding_rate : undefined);
  return Number.isFinite(v as number) ? (v as number) : undefined;
}

function read1h(p: AnyPoint): number | undefined {
  const v =
    (typeof p.interest_1h === "number" ? p.interest_1h : undefined) ??
    (typeof p.rate_1h === "number" ? p.rate_1h : undefined);
  return Number.isFinite(v as number) ? (v as number) : undefined;
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sampleSd(xs: number[], m: number) {
  if (xs.length < 2) return 0;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

export function useDeribitFunding(instrument = "BTC-PERPETUAL", zLookbackDays = DEFAULT_Z_LOOKBACK_DAYS) {
  const [state, setState] = useState<FundingState>({ loading: true });

  const load = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: undefined }));

      const now = Date.now();

      async function fetchSeries(start: number, end: number) {
        if (DEBUG) console.debug("[funding] params", { instrument, start, end });

        // Try 8h directly via period=28800
        let series: AnyPoint[] = [];
        let aggregatedFrom1h = false;

        try {
          const hist8 = await dget<any>(
            "/public/get_funding_rate_history",
            { instrument_name: instrument, start_timestamp: Math.floor(start), end_timestamp: Math.floor(end), period: 28800 }
          );
          series = normalizeFundingArray(hist8);
          if (DEBUG) console.debug("[funding] history(8h) count =", series.length, "sample =", series.slice(-3));
        } catch (e) {
          if (DEBUG) console.debug("[funding] history(8h) error", e);
        }

        // Fallback: 1h history and aggregate to 8h
        if (!series.length) {
          try {
            const hist1 = await dget<any>(
              "/public/get_funding_rate_history",
              { instrument_name: instrument, start_timestamp: Math.floor(start), end_timestamp: Math.floor(end), period: 3600 }
            );
            const s1 = normalizeFundingArray(hist1);
            if (DEBUG) console.debug("[funding] history(1h) count =", s1.length, "sample =", s1.slice(-3));
            if (s1.length) {
              const a1 = s1.map(read1h).filter((x): x is number => typeof x === "number");
              if (a1.length >= 8) {
                const roll = rollingSumN(a1, 8);
                series = roll.map((sum, i) => ({
                  timestamp: s1[i + 7]?.timestamp ?? end,
                  interest_8h: sum,
                }));
                aggregatedFrom1h = true;
              }
            }
          } catch (e) {
            if (DEBUG) console.debug("[funding] history(1h) error", e);
          }
        }

        // Last chance: chart_data (unwindowed)
        if (!series.length) {
          try {
            const chart = await dget<any>("/public/get_funding_chart_data", { instrument_name: instrument });
            const s2 = normalizeFundingArray(chart);
            if (DEBUG) console.debug("[funding] chart_data fallback count =", s2.length, "sample =", s2.slice(-3));
            if (s2.length) series = s2;
          } catch (e) {
            if (DEBUG) console.debug("[funding] chart_data fallback error", e);
          }
        }

        return { series, aggregatedFrom1h };
      }

      // Prefer zLookbackDays (30d), but fall back to 7d if Deribit/proxy rejects long windows.
      const candidates = [Math.max(7, Math.round(zLookbackDays)), 7];
      let usedLookbackDays = candidates[0];

      let series: AnyPoint[] = [];
      let aggregatedFrom1h = false;

      for (const days of candidates) {
        const start = now - days * DAY_MS;
        const got = await fetchSeries(start, now);
        if (got.series.length) {
          series = got.series;
          aggregatedFrom1h = got.aggregatedFrom1h;
          usedLookbackDays = days;
          break;
        }
      }

      if (!series.length) {
        setState({ loading: false, error: "No funding data returned" });
        return;
      }

      // Normalize into sorted points with ts + v
      const points = series
        .map((p) => {
          const ts = typeof p.timestamp === "number" ? p.timestamp : undefined;
          const v = read8h(p);
          return ts != null && v != null ? { ts, v } : null;
        })
        .filter((x): x is { ts: number; v: number } => x != null)
        .sort((a, b) => a.ts - b.ts);

      if (DEBUG) console.debug("[funding] final points =", points.length, "aggregatedFrom1h =", aggregatedFrom1h);

      if (!points.length) {
        setState({ loading: false, error: "No usable funding values in window" });
        return;
      }

      const last = points[points.length - 1];
      const current8h = last.v;
      const updatedAt = last.ts;

      // 7d avg (always on last 7d slice)
      const cutoff7 = now - 7 * DAY_MS;
      const vals7 = points.filter((p) => p.ts >= cutoff7).map((p) => p.v);
      const avg7d8h = vals7.length ? mean(vals7) : undefined;

      // z-score on usedLookbackDays slice (prefer 30d)
      const cutoffZ = now - usedLookbackDays * DAY_MS;
      const valsZ = points.filter((p) => p.ts >= cutoffZ).map((p) => p.v);

      let zScore: number | undefined = undefined;
      const zBase = (valsZ.length >= MIN_Z_POINTS ? valsZ : vals7.length ? vals7 : points.map((p) => p.v));
      if (zBase.length >= 2) {
        const m = mean(zBase);
        const sd = sampleSd(zBase, m);
        if (sd > 1e-12) zScore = (current8h - m) / sd;
      }

      if (DEBUG) console.debug("[funding] computed", { current8h, avg7d8h, zScore, usedLookbackDays, updatedAt });

      setState({
        current8h,
        avg7d8h,
        zScore,
        zLookbackDays: usedLookbackDays,
        updatedAt,
        ts: updatedAt,
        loading: false,
      });
    } catch (e: any) {
      if (DEBUG) console.debug("[funding] error", e);
      setState({ loading: false, error: String(e) });
    }
  }, [instrument, zLookbackDays]);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: load };
}
