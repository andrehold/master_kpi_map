import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeribitInstrument } from "../../services/deribit";
import {
  getInstruments,
  getTicker,
  getIndexPrice,
} from "../../services/deribit";
import { normalizeDeribitIv } from "../../lib/deribitOptionMath";

/**
 * useTermStructureKink (matches your deribit.ts service)
 *
 * Uses:
 *  - getActiveOptionInstruments(currency)
 *  - getIndexPrice(currency)
 *  - getBookSummary(instrument_name)
 *
 * Computes the KPI "Term Structure Kink (0DTE vs 1–3DTE IV)".
 * No network code lives here — all fetching is via your service.
 */

export type DeribitCurrency = "BTC" | "ETH";

export interface TermStructureKinkData {
  currency: DeribitCurrency;
  indexPrice?: number;
  asOf: number;
  iv0dte?: number; // decimal (e.g., 0.72)
  ivs1to3dte: Record<1 | 2 | 3, number | undefined>;
  mean1to3?: number;
  kinkPoints?: number; // iv0 - mean(1..3)
  kinkRatio?: number;  // iv0 / mean(1..3)
  atmInstruments: { d0?: string; d1?: string; d2?: string; d3?: string };
}

export interface UseTermStructureKinkOptions {
  /** Polling interval in ms; set to undefined/0 to disable (default: disabled). */
  pollMs?: number;
}

export interface UseTermStructureKinkReturn {
  data?: TermStructureKinkData;
  loading: boolean;       // align with other hooks
  /** kept for backward compat; alias of `loading` */
  isLoading?: boolean;
  error?: string;
  refresh: () => void;
}

// ————————————————————————————————————————————————————————————
// Local helpers (no fetching here)
// ————————————————————————————————————————————————————————————

const DAY_MS = 24 * 60 * 60 * 1000;

function dayBucket(expMs: number, nowMs: number): 0 | 1 | 2 | 3 | null {
  const diffDays = Math.floor((expMs - nowMs) / DAY_MS);
  if (diffDays < 0) return null;
  if (diffDays === 0) return 0;
  if (diffDays >= 1 && diffDays <= 3) return diffDays as 1 | 2 | 3;
  return null;
}

function pickAtmInstrument(instruments: DeribitInstrument[], indexPrice: number) {
  if (!instruments.length || !indexPrice || !isFinite(indexPrice)) return undefined as DeribitInstrument | undefined;
  let best: DeribitInstrument | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const ins of instruments) {
    if (!ins.strike || ins.strike <= 0) continue;
    const score = Math.abs(Math.log(ins.strike / indexPrice)); // stable ATM metric
    if (score < bestScore) {
      bestScore = score;
      best = ins;
    }
  }
  return best;
}

function mean(values: Array<number | undefined>): number | undefined {
  const arr = values.filter((v): v is number => typeof v === "number" && isFinite(v));
  if (!arr.length) return undefined;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ————————————————————————————————————————————————————————————
// Public hook (service-based)
// ————————————————————————————————————————————————————————————

export function useTermStructureKink(
  currency: DeribitCurrency = "BTC",
  opts: UseTermStructureKinkOptions = {}
): UseTermStructureKinkReturn {
  const { pollMs } = opts;

  const [data, setData] = useState<TermStructureKinkData>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const mounted = useRef(true);
  const tickRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const now = Date.now();

      // Delegate all data fetching to your service
      const [instruments, indexPrice] = await Promise.all([
        getInstruments(currency),
        getIndexPrice(currency),
      ]);

      if (!instruments?.length) throw new Error("No active option instruments returned by service.");
      if (!indexPrice || !isFinite(indexPrice)) throw new Error("Could not fetch index price.");

      // Group by 0 / 1..3 DTE buckets
      const byBucket: Record<0 | 1 | 2 | 3, DeribitInstrument[]> = { 0: [], 1: [], 2: [], 3: [] };
      for (const ins of instruments) {
        const b = dayBucket(ins.expiration_timestamp, now);
        if (b === 0 || b === 1 || b === 2 || b === 3) byBucket[b].push(ins);
      }

      // ATM per bucket
      const atm0 = pickAtmInstrument(byBucket[0], indexPrice);
      const atm1 = pickAtmInstrument(byBucket[1], indexPrice);
      const atm2 = pickAtmInstrument(byBucket[2], indexPrice);
      const atm3 = pickAtmInstrument(byBucket[3], indexPrice);

      // Per-instrument summaries (<= 4 requests)
      const [s0, s1, s2, s3] = await Promise.all([
        atm0 ? getTicker(atm0.instrument_name) : Promise.resolve(null),
        atm1 ? getTicker(atm1.instrument_name) : Promise.resolve(null),
        atm2 ? getTicker(atm2.instrument_name) : Promise.resolve(null),
        atm3 ? getTicker(atm3.instrument_name) : Promise.resolve(null),
      ]);

      const iv0 = normalizeDeribitIv(s0?.mark_iv);
      const iv1 = normalizeDeribitIv(s1?.mark_iv);
      const iv2 = normalizeDeribitIv(s2?.mark_iv);
      const iv3 = normalizeDeribitIv(s3?.mark_iv);

      const m13 = mean([iv1, iv2, iv3]);
      const kinkPts = iv0 !== undefined && m13 !== undefined ? iv0 - m13 : undefined;
      const kinkRat = iv0 !== undefined && m13 !== undefined && m13 !== 0 ? iv0 / m13 : undefined;

      const next: TermStructureKinkData = {
        currency,
        indexPrice,
        asOf: now,
        iv0dte: iv0,
        ivs1to3dte: { 1: iv1, 2: iv2, 3: iv3 },
        mean1to3: m13,
        kinkPoints: kinkPts,
        kinkRatio: kinkRat,
        atmInstruments: { d0: atm0?.instrument_name, d1: atm1?.instrument_name, d2: atm2?.instrument_name, d3: atm3?.instrument_name },
      };

      if (mounted.current) setData(next);
    } catch (err: any) {
      if (mounted.current) setError(err?.message || String(err));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [currency]);

  const refresh = useCallback(() => { void compute(); }, [compute]);

  useEffect(() => {
    void compute();
    if (pollMs && pollMs > 0) {
      tickRef.current = window.setInterval(() => void compute(), pollMs);
      return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
    }
    return;
  }, [compute, pollMs]);

  return useMemo(
    () => ({ data, loading, isLoading: loading, error, refresh }),
    [data, loading, error]
  );
}