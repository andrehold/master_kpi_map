import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPerpHistory } from "../../services/deribit";
import { realizedVolFromCandles, parkinsonVolFromCandles } from "../../lib/ohlc";

export type UseRealizedVolOptions = {
  currency?: "BTC" | "ETH";
  windowDays?: number;       // trailing window in days (e.g., 20)
  resolutionSec?: number;    // bar size (default daily)
  annualizationDays?: number; // 365 for crypto
  includeParkinson?: boolean;
};

export type UseRealizedVolReturn = {
  rv?: number;            // decimal (e.g., 0.48 => 48%)
  parkinsonRv?: number;            // decimal (e.g., 0.48 => 48%)
  lastUpdated?: number;   // ms
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

export function useRealizedVol(options: UseRealizedVolOptions = {}): UseRealizedVolReturn {
  const {
    currency = "BTC",
    windowDays = 20,
    resolutionSec = 86400,
    annualizationDays = 365,
    includeParkinson = false,
  } = options;

  const [rv, setRv] = useState<number | undefined>(undefined);
  const [rvParkinson, setRvParkinson] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [ts, setTs] = useState<number | undefined>(undefined);
  const tick = useRef(0);

  const run = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    // If caller turns Parkinson off, don't keep stale values around
    if (!includeParkinson) setRvParkinson(undefined);

    try {
      const limit = Math.max(windowDays + 50, windowDays + 1); // buffer for missing bars
      const candles = await fetchPerpHistory(currency, limit, resolutionSec);
      const closeVal = realizedVolFromCandles(candles, windowDays, resolutionSec, annualizationDays);
      if (closeVal === undefined) throw new Error("Insufficient price history for RV");

      setRv(closeVal);

      if (includeParkinson) {
        const parkVal = parkinsonVolFromCandles(candles, windowDays, resolutionSec, annualizationDays);
        setRvParkinson(parkVal);
      }
      setTs(Date.now());
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [currency, windowDays, resolutionSec, annualizationDays, includeParkinson]);

  useEffect(() => { run(); }, [run, tick.current]);

  const refresh = useCallback(async () => { tick.current++; await run(); }, [run]);

  return useMemo(() => ({ rv, rvParkinson, lastUpdated: ts, loading, error, refresh }), [rv, rvParkinson, ts, loading, error, refresh]);
}


