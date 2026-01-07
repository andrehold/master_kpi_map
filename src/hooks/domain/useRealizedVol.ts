import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPerpHistory } from "../../services/deribit";
import { realizedVolFromCandles, parkinsonVolFromCandles } from "../../lib/ohlc";

export type UseRealizedVolOptions = {
  currency?: "BTC" | "ETH";
  windowDays?: number;
  resolutionSec?: number;
  annualizationDays?: number;
  includeParkinson?: boolean;
};

export type UseRealizedVolReturn = {
  rv?: number; // close-to-close, decimal
  rvParkinson?: number; // range-based, decimal
  lastUpdated?: number;
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

    if (!includeParkinson) setRvParkinson(undefined);

    try {
      const limit = Math.max(windowDays + 50, windowDays + 1);
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

  return useMemo(
    () => ({ rv, rvParkinson, lastUpdated: ts, loading, error, refresh }),
    [rv, rvParkinson, ts, loading, error, refresh]
  );
}

