// src/hooks/useATMIVPoints.ts
import { useEffect, useRef, useState } from "react";
import { getATMIVPoints, type IVPoint } from "../services/deribit";

export type UseATMIVPointsOptions = {
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
};

export function useATMIVPoints(options: UseATMIVPointsOptions = {}) {
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
      const res = await getATMIVPoints(currency, { maxExpiries, bandPct, minDteHours }, signal);
      if (!signal?.aborted) setData(res);
    } catch (e: any) {
      if (!signal?.aborted) setError(e?.message ?? "Failed to load ATM IV points");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ctl = new AbortController();
    run(ctl.signal);
    return () => ctl.abort();
  }, [currency, maxExpiries, bandPct, minDteHours]);

  useEffect(() => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    if (refreshMs > 0) {
      timer.current = window.setInterval(() => {
        const ctl = new AbortController();
        run(ctl.signal);
      }, refreshMs) as unknown as number;
    }
    return () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; };
  }, [refreshMs, currency, maxExpiries, bandPct, minDteHours]);

  const reload = () => run();

  return { data, loading, error, reload };
}
