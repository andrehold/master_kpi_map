import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPerpHistory } from "../../services/deribit";
import { realizedVolFromCandles } from "../../lib/ohlc";

export type UseRealizedVolOptions = {
  currency?: "BTC" | "ETH";
  windowDays?: number;       // trailing window in days (e.g., 20)
  resolutionSec?: number;    // bar size (default daily)
  annualizationDays?: number; // 365 for crypto
};

export type UseRealizedVolReturn = {
  rv?: number;            // decimal (e.g., 0.48 => 48%)
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
  } = options;

  const [rv, setRv] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [ts, setTs] = useState<number | undefined>(undefined);
  const tick = useRef(0);

  const run = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const limit = Math.max(windowDays + 50, windowDays + 1); // buffer for missing bars
      const candles = await fetchPerpHistory(currency, limit, resolutionSec);
      const val = realizedVolFromCandles(candles, windowDays, resolutionSec, annualizationDays);
      if (val === undefined) throw new Error("Insufficient price history for RV");
      setRv(val);
      setTs(Date.now());
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [currency, windowDays, resolutionSec, annualizationDays]);

  useEffect(() => { run(); }, [run, tick.current]);

  const refresh = useCallback(async () => { tick.current++; await run(); }, [run]);

  return useMemo(() => ({ rv, lastUpdated: ts, loading, error, refresh }), [rv, ts, loading, error, refresh]);
}


