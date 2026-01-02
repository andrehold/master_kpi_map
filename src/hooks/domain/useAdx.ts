// src/hooks/domain/useAdx.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPerpHistory } from "../../services/deribit";
import { barsPerDay, computeAdxSeries, type AdxPoint } from "../../lib/ohlc";

export type UseAdxOptions = {
  currency?: "BTC" | "ETH";
  /** ADX period in DAYS (Wilder). Default 14 (classic). */
  periodDays?: number;
  /** ΔADX lookback in DAYS for slope. Default 5. */
  deltaDays?: number;
  /** Bar resolution. Default daily. */
  resolutionSec?: number;
};

export type UseAdxReturn = {
  adx?: number;        // 0..100
  diPlus?: number;     // 0..100
  diMinus?: number;    // 0..100
  adxDelta?: number;   // latest - lookback (same units as ADX)
  lastUpdated?: number;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

function lastDefinedIndex(series: AdxPoint[], key: keyof AdxPoint): number {
  for (let i = series.length - 1; i >= 0; i--) {
    const v = series[i][key];
    if (typeof v === "number" && Number.isFinite(v)) return i;
  }
  return -1;
}

function findDefinedAtOrBefore(series: AdxPoint[], startIdx: number, key: keyof AdxPoint): number {
  for (let i = Math.min(startIdx, series.length - 1); i >= 0; i--) {
    const v = series[i][key];
    if (typeof v === "number" && Number.isFinite(v)) return i;
  }
  return -1;
}

export function useAdx(opts: UseAdxOptions = {}): UseAdxReturn {
  const {
    currency = "BTC",
    periodDays = 14,
    deltaDays = 5,
    resolutionSec = 86400,
  } = opts;

  const [adx, setAdx] = useState<number | undefined>(undefined);
  const [diPlus, setDiPlus] = useState<number | undefined>(undefined);
  const [diMinus, setDiMinus] = useState<number | undefined>(undefined);
  const [adxDelta, setAdxDelta] = useState<number | undefined>(undefined);
  const [ts, setTs] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const tick = useRef(0);

  const run = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const bpd = barsPerDay(resolutionSec);
      const periodBars = Math.max(2, Math.round(periodDays * bpd));
      const deltaBars = Math.max(1, Math.round(deltaDays * bpd));

      // Need enough bars for ADX: first ADX appears around ~2*periodBars.
      const minNeeded = 2 * periodBars + deltaBars + 10;
      const limit = Math.max(250, minNeeded);

      const candles = await fetchPerpHistory(currency, limit, resolutionSec);
      const series = computeAdxSeries(candles, periodBars);

      const iLastAdx = lastDefinedIndex(series, "adx");
      if (iLastAdx < 0) throw new Error("Insufficient price history for ADX");

      const last = series[iLastAdx];
      const iPrev = findDefinedAtOrBefore(series, iLastAdx - deltaBars, "adx");

      setAdx(last.adx);
      setDiPlus(last.diPlus);
      setDiMinus(last.diMinus);

      if (iPrev >= 0 && typeof series[iPrev].adx === "number" && typeof last.adx === "number") {
        setAdxDelta(last.adx - (series[iPrev].adx as number));
      } else {
        setAdxDelta(undefined);
      }

      setTs(Date.now());
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [currency, periodDays, deltaDays, resolutionSec]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, tick.current]);

  const refresh = useCallback(async () => {
    tick.current++;
    await run();
  }, [run]);

  return useMemo(
    () => ({
      adx,
      diPlus,
      diMinus,
      adxDelta,
      lastUpdated: ts,
      loading,
      error,
      refresh,
    }),
    [adx, diPlus, diMinus, adxDelta, ts, loading, error, refresh]
  );
}
