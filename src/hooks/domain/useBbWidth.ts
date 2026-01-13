import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPerpHistory } from "../../services/deribit";

export type UseBbWidthOptions = {
  currency?: "BTC" | "ETH";
  periodDays?: number;     // default 20
  sigma?: number;          // default 2
  deltaDays?: number;      // default 5 (for slope)
  resolutionSec?: number;  // default daily
};

export type UseBbWidthReturn = {
  widthPct?: number;      // percent
  widthDelta?: number;    // pct-pts vs lookback
  mid?: number;           // SMA
  stdev?: number;         // price units
  lastUpdated?: number;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}
function stdev(xs: number[]) {
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, xs.length);
  return Math.sqrt(v);
}
function barsPerDay(resolutionSec: number) {
  return 86400 / Math.max(60, resolutionSec);
}

export function useBbWidth(opts: UseBbWidthOptions = {}): UseBbWidthReturn {
  const {
    currency = "BTC",
    periodDays = 20,
    sigma = 2,
    deltaDays = 5,
    resolutionSec = 86400,
  } = opts;

  const [widthPct, setWidthPct] = useState<number | undefined>();
  const [widthDelta, setWidthDelta] = useState<number | undefined>();
  const [mid, setMid] = useState<number | undefined>();
  const [sd, setSd] = useState<number | undefined>();
  const [ts, setTs] = useState<number | undefined>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const tick = useRef(0);

  const computeAt = (closes: number[], i: number, win: number) => {
    if (i < win - 1) return null;
    const slice = closes.slice(i - win + 1, i + 1);
    const m = mean(slice);
    const s = stdev(slice);
    if (!Number.isFinite(m) || m === 0 || !Number.isFinite(s)) return null;

    // upper-lower = 2*sigma*stdev; width% = (upper-lower)/mid * 100
    const w = (2 * sigma * s / m) * 100;
    return { w, m, s };
  };

  const run = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const bpd = barsPerDay(resolutionSec);
      const win = Math.max(5, Math.round(periodDays * bpd));
      const deltaBars = Math.max(1, Math.round(deltaDays * bpd));

      const limit = Math.max(300, 2 * win + deltaBars + 20);
      const candles = await fetchPerpHistory(currency, limit, resolutionSec);
      const closes = candles.map((c) => c.close).filter((v) => Number.isFinite(v));

      if (closes.length < win + 5) throw new Error("Insufficient price history for BB Width");

      const iLast = closes.length - 1;
      const last = computeAt(closes, iLast, win);
      if (!last) throw new Error("Unable to compute BB Width");

      // find a valid prev point ~deltaBars back (walk backward if needed)
      let iPrev = Math.max(win - 1, iLast - deltaBars);
      let prev = computeAt(closes, iPrev, win);
      while (!prev && iPrev > win - 1) {
        iPrev--;
        prev = computeAt(closes, iPrev, win);
      }

      setWidthPct(last.w);
      setMid(last.m);
      setSd(last.s);

      if (prev?.w != null) setWidthDelta(last.w - prev.w);
      else setWidthDelta(undefined);

      setTs(Date.now());
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [currency, periodDays, sigma, deltaDays, resolutionSec]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, tick.current]);

  const refresh = useCallback(async () => {
    tick.current++;
    await run();
  }, [run]);

  return useMemo(
    () => ({ widthPct, widthDelta, mid, stdev: sd, lastUpdated: ts, loading, error, refresh }),
    [widthPct, widthDelta, mid, sd, ts, loading, error, refresh]
  );
}
