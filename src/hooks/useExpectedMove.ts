// src/hooks/useExpectedMove.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { buildAtmIvPoints, type IVPoint, type AtmSelection } from "../lib/atmIv";

/**
 * Expected Move (EM) hook
 *
 * - Collects ATM IV points via shared lib (curated by default).
 * - Interpolates IV across DTE to estimate per-horizon IV.
 * - Computes 1σ expected move (percent and absolute) for each horizon:
 *      EM%  = IV * sqrt(days / 365)
 *      EM$  = spot * IV * sqrt(days / 365)
 *
 * IVs are decimals (e.g., 0.452 = 45.2%).
 */

const DAY_MS = 86_400_000;

export type HorizonSpec = number; // days, e.g. 1, 7, 30

export type ExpectedMovePoint = {
  days: number;        // horizon in days
  iv: number | null;   // interpolated decimal IV used for EM at this horizon
  pct: number | null;  // expected move in percent (decimal, e.g. 0.05 = 5%)
  abs: number | null;  // expected move in price units (spot * pct)
};

export type UseExpectedMoveOptions = {
  currency?: "BTC" | "ETH";

  // Horizons to compute EM for (in days)
  horizons?: HorizonSpec[];     // default: [1, 7, 30]

  // Data refresh (ms); 0 = no polling
  refreshMs?: number;           // default: 0

  // Guardrails for collecting ATM IV points
  minDteHours?: number;         // default: 12
  bandPct?: number;             // default: 0 (no band)

  // Selection of expiries: keep "curated" for EM by default
  selection?: AtmSelection;     // "curated" | "all" (default "curated")

  // Curated mode params
  maxExpiries?: number;         // default: 8
  nearDays?: number;            // default: 14

  // "All" mode params (not typical for EM, but supported)
  minDteDays?: number;          // default: 2
  maxDteDays?: number;          // default: 400
  maxAllExpiries?: number;      // default: 48
};

export type UseExpectedMoveState = {
  asOf: number | null;
  currency: "BTC" | "ETH";
  indexPrice: number | null;
  points: IVPoint[];              // ATM IV curve used
  em: ExpectedMovePoint[];        // EM across horizons
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Math helpers */
function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function sqrtYearFrac(days: number) {
  return Math.sqrt(Math.max(0, days) / 365);
}

function interpLinear(x0: number, y0: number, x1: number, y1: number, x: number) {
  if (x1 === x0) return y0; // degenerate, but avoid divide-by-zero
  const t = (x - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

/**
 * Interpolate IV at a given horizon (days) from sorted IV points by dteDays.
 * - If outside range, clamps to nearest endpoint.
 * - Returns null if not enough data.
 */
function ivAtDays(pointsSorted: IVPoint[], days: number): number | null {
  if (!pointsSorted.length) return null;

  // Ensure sorted (defensive)
  const pts = [...pointsSorted].sort((a, b) => a.dteDays - b.dteDays);

  // Clamp outside range
  if (days <= pts[0].dteDays) return pts[0].iv ?? null;
  if (days >= pts[pts.length - 1].dteDays) return pts[pts.length - 1].iv ?? null;

  // Find bracketing segment
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (days >= a.dteDays && days <= b.dteDays) {
      if (a.iv == null || b.iv == null) return null;
      return interpLinear(a.dteDays, a.iv, b.dteDays, b.iv, days);
    }
  }
  return null;
}

/**
 * Compute Expected Move across horizons for a given spot and IV curve.
 * Returns percent (decimal) and absolute move.
 */
function computeExpectedMove(
  spot: number | null | undefined,
  pointsSorted: IVPoint[],
  horizons: number[]
): ExpectedMovePoint[] {
  const s = typeof spot === "number" && isFinite(spot) && spot > 0 ? spot : null;
  return horizons.map((d) => {
    const iv = ivAtDays(pointsSorted, d);
    if (iv == null) {
      return { days: d, iv: null, pct: null, abs: null };
    }
    const factor = sqrtYearFrac(d);
    const pct = iv * factor;     // decimal percent
    const abs = s != null ? s * pct : null;
    return { days: d, iv, pct, abs };
  });
}

export function useExpectedMove({
  currency = "BTC",
  horizons = [1, 7, 30],
  refreshMs = 0,

  // Guardrails for ATM collection
  minDteHours = 12,
  bandPct = 0,

  // Selection
  selection = "curated",

  // Curated params
  maxExpiries = 8,
  nearDays = 14,

  // "All" params
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
    // Defensive copy + numeric cleanup
    const hs = Array.from(new Set(horizons.map((d) => Math.max(0, Math.floor(d)))));
    hs.sort((a, b) => a - b);
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
      if (!signal?.aborted) {
        setError(e?.message ?? String(e));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
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

  const em = useMemo(() => {
    return computeExpectedMove(indexPrice, points, horizonsNorm);
  }, [indexPrice, points, horizonsNorm]);

  const reload = () => run();

  return {
    asOf,
    currency,
    indexPrice,
    points,
    em,
    loading,
    error,
    reload,
  };
}
