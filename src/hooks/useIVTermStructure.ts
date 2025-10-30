// src/hooks/useIVTermStructure.ts
import { useEffect, useRef, useState } from "react";
import { getATMIVPoints, type IVPoint } from "../services/deribit";
import { getTermStructureStats, type IVTermStructureLabel } from "../lib/ivTerm";

export type UseIVTermStructureOptions = {
  currency?: "BTC" | "ETH";
  maxExpiries?: number;
  bandPct?: number;     // e.g., 0.07 => ±7% around spot for candidate strikes
  minDteHours?: number; // skip expiries expiring within N hours (default 12)
  refreshMs?: number;   // polling interval; 0 = no polling
};

type State = {
  asOf: string;
  currency: "BTC" | "ETH";
  indexPrice: number;
  points: IVPoint[];

  // computed stats
  n: number;
  slopePerYear: number | null;
  termPremium: number | null;
  label: IVTermStructureLabel;
};

export function useIVTermStructure(options: UseIVTermStructureOptions = {}) {
  const {
    currency = "BTC",
    maxExpiries = 6,
    bandPct,
    minDteHours = 12,
    refreshMs = 0,
  } = options;

  const [data, setData] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const run = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      // 1) fetch points (pure fetching lives in services)
      const res = await getATMIVPoints(
        currency,
        { maxExpiries, bandPct, minDteHours },
        signal
      );

      // 2) compute stats (pure utils — no fetching)
      const { n, slopePerYear, termPremium, label } = getTermStructureStats(res.points);

      if (!signal?.aborted) {
        setData({
          ...res,
          n,
          slopePerYear,
          termPremium,
          label,
        });
      }
    } catch (e: any) {
      if (!signal?.aborted) setError(e?.message ?? "Failed to load IV term structure");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ctl = new AbortController();
    run(ctl.signal);
    return () => ctl.abort();
  }, [currency, maxExpiries, bandPct, minDteHours]);

  // optional polling (mind Deribit limits)
  useEffect(() => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    if (refreshMs > 0) {
      timer.current = window.setInterval(() => {
        const ctl = new AbortController();
        run(ctl.signal);
      }, refreshMs) as unknown as number;
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [refreshMs, currency, maxExpiries, bandPct, minDteHours]);

  const reload = () => run();

  return { data, loading, error, reload };
}
