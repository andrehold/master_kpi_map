// src/hooks/useIVTermStructure.ts
import { useEffect, useRef, useState } from "react";
import { getTermStructureStats, type IVTermStructureLabel } from "../lib/ivTerm";
import { buildAtmIvPoints, type IVPoint, type AtmSelection } from "../lib/atmIv";

export type UseIVTermStructureOptions = {
  currency?: "BTC" | "ETH";
  bandPct?: number;
  minDteHours?: number;
  refreshMs?: number;

  // selection passthrough
  selection?: AtmSelection;   // "curated" | "all" (default "curated")

  // Curated mode
  maxExpiries?: number;       // default 8
  nearDays?: number;          // default 14

  // "All" mode
  minDteDays?: number;        // default 2
  maxDteDays?: number;        // default 400
  maxAllExpiries?: number;    // default 48
};

export type IVTermStructureData = {
  asOf: number;
  currency: string;
  indexPrice: number | null;
  points: IVPoint[];
  n: number;
  slopePerYear: number | null;
  termPremium: number | null;
  label: IVTermStructureLabel;
};

export function useIVTermStructure({
  currency = "BTC",
  bandPct = 0,
  minDteHours = 12,
  refreshMs = 0,

  selection = "curated",

  maxExpiries = 8,
  nearDays = 14,

  minDteDays = 2,
  maxDteDays = 400,
  maxAllExpiries = 48,
}: UseIVTermStructureOptions = {}) {
  const [data, setData] = useState<IVTermStructureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  async function run(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);

      const { asOf, indexPrice, points } = await buildAtmIvPoints({
        currency,
        bandPct,
        minDteHours,
        selection,
        maxExpiries,
        nearDays,
        minDteDays,
        maxDteDays,
        maxAllExpiries,
        signal,
      });

      const stats = getTermStructureStats(points);

      const payload: IVTermStructureData = {
        asOf,
        currency,
        indexPrice,
        points,
        n: stats.n,
        slopePerYear: stats.slopePerYear,
        termPremium: stats.termPremium,
        label: stats.label,
      };
      if (!signal?.aborted) setData(payload);
    } catch (e: any) {
      if (!signal?.aborted) setError(e?.message ?? String(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const ctl = new AbortController();
    run(ctl.signal);
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currency, bandPct, minDteHours,
    selection, maxExpiries, nearDays,
    minDteDays, maxDteDays, maxAllExpiries,
  ]);

  useEffect(() => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    if (refreshMs && refreshMs > 0) {
      timer.current = window.setInterval(() => {
        const ctl = new AbortController();
        run(ctl.signal);
      }, refreshMs) as unknown as number;
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [refreshMs, currency, selection]);

  const reload = () => run();

  return { data, loading, error, reload };
}
