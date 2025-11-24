// src/hooks/useDeribitFunding.ts
import { useEffect, useState, useCallback } from "react";
import { dget } from "../../services/deribit"; // adjust if your helper is elsewhere

type AnyPoint = {
  timestamp?: number;           // ms epoch
  // Various possible fields we may encounter
  interest_1h?: number;
  interest_8h?: number;
  funding_rate?: number;
  rate_1h?: number;
  rate_8h?: number;
  [k: string]: any;
};

type FundingState = {
  current8h?: number;   // decimal per 8h (e.g., 0.0005 => 0.05%)
  avg7d8h?: number;     // decimal
  zScore?: number;
  updatedAt?: number;
  loading: boolean;
  error?: string;
};

const DEBUG = true;

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
    // Map to a common shape
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

export function useDeribitFunding(instrument = "BTC-PERPETUAL") {
  const [state, setState] = useState<FundingState>({ loading: true });

  const load = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: undefined }));

      const now = Date.now();
      const start = now - 7 * 24 * 60 * 60 * 1000; // last 7 days

      if (DEBUG) console.debug("[funding] params", { instrument, start, end: now });

      // Try 8h directly via period=28800
      let series: AnyPoint[] = [];
      try {
        const hist8 = await dget<any>(
          "/public/get_funding_rate_history",
          { instrument_name: instrument, start_timestamp: Math.floor(start), end_timestamp: Math.floor(now), period: 28800 }
        );
        series = normalizeFundingArray(hist8);
        if (DEBUG) {
          console.debug("[funding] history(8h) keys(result) =", Object.keys(hist8?.result ?? hist8 ?? {}));
          console.debug("[funding] history(8h) count =", series.length, "sample =", series.slice(-3));
        }
      } catch (e) {
        if (DEBUG) console.debug("[funding] history(8h) error", e);
      }

      // Fallback: 1h history and aggregate
      let aggregatedFrom1h = false;
      if (!series.length) {
        try {
          const hist1 = await dget<any>(
            "/public/get_funding_rate_history",
            { instrument_name: instrument, start_timestamp: Math.floor(start), end_timestamp: Math.floor(now), period: 3600 }
          );
          const s1 = normalizeFundingArray(hist1);
          if (DEBUG) console.debug("[funding] history(1h) count =", s1.length, "sample =", s1.slice(-3));
          if (s1.length) {
            const a1 = s1.map(read1h).filter((x): x is number => typeof x === "number");
            if (a1.length >= 8) {
              const roll = rollingSumN(a1, 8);
              // Rebuild a pseudo-8h series aligned to the end
              series = roll.map((sum, i) => ({
                timestamp: s1[i + 7]?.timestamp ?? now,
                interest_8h: sum,
              }));
              aggregatedFrom1h = true;
            }
          }
        } catch (e) {
          if (DEBUG) console.debug("[funding] history(1h) error", e);
        }
      }

      // Last chance: chart_data without length (some proxies reject length=7d)
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

      if (!series.length) {
        setState({ loading: false, error: "No funding data returned" });
        return;
      }

      const last = series[series.length - 1] ?? {};
      const a8 = series.map(read8h).filter((x): x is number => typeof x === "number");

      // If we still don't see any 8h numbers but we earlier aggregated, a8 will be filled from interest_8h
      if (DEBUG) console.debug("[funding] final series len =", series.length, "has8h =", a8.length, "aggregatedFrom1h =", aggregatedFrom1h);

      let current8h: number | undefined = undefined;
      let updatedAt: number | undefined = typeof last.timestamp === "number" ? last.timestamp : now;

      for (let i = series.length - 1; i >= 0; i--) {
        const v8 = read8h(series[i]);
        if (v8 !== undefined) {
          current8h = v8;
          updatedAt = typeof series[i].timestamp === "number" ? series[i].timestamp : updatedAt;
          break;
        }
      }

      let avg7d8h: number | undefined = undefined;
      if (a8.length >= 2) {
        avg7d8h = a8.reduce((a, b) => a + b, 0) / a8.length;
      }

      let zScore: number | undefined = undefined;
      if (current8h !== undefined && avg7d8h !== undefined && a8.length > 1) {
        const mean = avg7d8h;
        const sd = Math.sqrt(a8.reduce((s, x) => s + (x - mean) ** 2, 0) / (a8.length - 1));
        if (sd > 0) zScore = (current8h - mean) / sd;
      }

      if (DEBUG) console.debug("[funding] computed", { current8h, avg7d8h, zScore, updatedAt });

      if (current8h === undefined && avg7d8h === undefined) {
        setState({ loading: false, error: "No usable funding values in window" });
        return;
      }

      setState({ current8h, avg7d8h, zScore, updatedAt, loading: false });
    } catch (e: any) {
      if (DEBUG) console.debug("[funding] error", e);
      setState({ loading: false, error: String(e) });
    }
  }, [instrument]);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: load };
}
