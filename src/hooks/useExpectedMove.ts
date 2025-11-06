// src/hooks/useExpectedMove.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { buildAtmIvPoints, type IVPoint, type AtmSelection } from "../lib/atmIv";

/**
 * Expected Move (EM) hook
 *
 * EM%  = IV * sqrt(days / 365)
 * EM$  = spot * EM%
 *
 * IV is a decimal (0.452 = 45.2%). Normalization happens in lib/atmIv.
 */

export type HorizonSpec = number; // days, e.g., 1, 7, 30, 90

export type ExpectedMovePoint = {
  days: number;
  iv: number | null;   // decimal IV used at this horizon
  pct: number | null;  // decimal pct move (e.g., 0.05 = 5%)
  abs: number | null;  // absolute move in price units
};

export type UseExpectedMoveOptions = {
  currency?: "BTC" | "ETH";
  horizons?: HorizonSpec[];     // default [1, 7, 30]
  refreshMs?: number;           // polling; default 0

  // Guardrails for ATM collection
  minDteHours?: number;         // default 12
  bandPct?: number;             // default 0

  // Selection of expiries (EM: keep "curated")
  selection?: AtmSelection;     // default "curated"

  // Curated params
  maxExpiries?: number;         // default 8
  nearDays?: number;            // default 14

  // "All" params (supported, not typical for EM)
  minDteDays?: number;          // default 2
  maxDteDays?: number;          // default 400
  maxAllExpiries?: number;      // default 48
};

export type UseExpectedMoveState = {
  asOf: number | null;
  currency: "BTC" | "ETH";
  indexPrice: number | null;
  points: IVPoint[];
  em: ExpectedMovePoint[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

function sqrtYearFrac(days: number) {
  return Math.sqrt(Math.max(0, days) / 365);
}

/** Linear IV interp across DTE; clamps to ends; returns null if not enough data. */
function ivAtDays(pointsSorted: IVPoint[], days: number): number | null {
  const pts = [...pointsSorted].sort((a, b) => a.dteDays - b.dteDays);
  if (!pts.length) return null;

  if (days <= pts[0].dteDays) return pts[0].iv ?? null;
  if (days >= pts[pts.length - 1].dteDays) return pts[pts.length - 1].iv ?? null;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (days >= a.dteDays && days <= b.dteDays) {
      if (a.iv == null || b.iv == null) return null;
      const t = (days - a.dteDays) / (b.dteDays - a.dteDays);
      return a.iv + t * (b.iv - a.iv);
    }
  }
  return null;
}

function computeExpectedMove(
  spot: number | null | undefined,
  pointsSorted: IVPoint[],
  horizons: number[]
): ExpectedMovePoint[] {
  const s = typeof spot === "number" && isFinite(spot) && spot > 0 ? spot : null;
  return horizons.map((d) => {
    const iv = ivAtDays(pointsSorted, d);
    if (iv == null) return { days: d, iv: null, pct: null, abs: null };
    const factor = sqrtYearFrac(d);
    const pct = iv * factor;
    const abs = s != null ? s * pct : null;
    return { days: d, iv, pct, abs };
  });
}

export function useExpectedMove({
  currency = "BTC",
  horizons = [1, 7, 30],
  refreshMs = 0,

  minDteHours = 12,
  bandPct = 0,

  selection = "curated",
  maxExpiries = 8,
  nearDays = 14,

  minDteDays = 2,
  maxDteDays = 400,
  maxAllExpiries = 48,
}: UseExpectedMoveOptions = {}): UseExpectedMoveState {
  const [asOf, setAsOf] = useState<number | null>(null);
  const [indexPrice, setIndexPrice] = useState<number | null>(null);
  const [points, setPoints] = useState<IVPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const horizonsNorm = useMemo(() => {
    const hs = Array.from(new Set(horizons.map((d) => Math.max(0, Math.floor(d))))).sort((a, b) => a - b);
    return hs;
  }, [horizons]);

  async function run(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);

      const { asOf, indexPrice, points } = await buildAtmIvPoints({
        currency,
        minDteHours,
        bandPct,
        selection,
        maxExpiries,
        nearDays,
        minDteDays,
        maxDteDays,
        maxAllExpiries,
        signal,
      });

      if (signal?.aborted) return;

      setAsOf(asOf);
      setIndexPrice(indexPrice);
      setPoints(points);
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
    currency,
    minDteHours,
    bandPct,
    selection,
    maxExpiries,
    nearDays,
    minDteDays,
    maxDteDays,
    maxAllExpiries,
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

  const em = useMemo(() => computeExpectedMove(indexPrice, points, horizonsNorm), [indexPrice, points, horizonsNorm]);

  const reload = () => run();

  return { asOf, currency, indexPrice, points, em, loading, error, reload };
}
