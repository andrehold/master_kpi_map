import { useEffect, useState } from "react";
import {
  fetchDvolHistory,
  fetchPerpHistory,
  DvolPoint,
  PriceCandle,
} from "../../services/deribit";

export type HitRateOfExpectedMoveStatus = "loading" | "ready" | "error";

export interface HitRateOfExpectedMoveMeta {
  /** Number of intervals where realized move ≤ expected move */
  hits: number;
  /** Number of intervals where realized move > expected move */
  misses: number;
  /** hits + misses (intervals actually evaluated, may be < lookbackDays) */
  total: number;
  /** Horizon in calendar days used for EM & realized move */
  horizonDays: number;
  /** Intended lookback window (start points) in days */
  lookbackDays: number;
}

export interface HitRateOfExpectedMoveKpiViewModel {
  status: HitRateOfExpectedMoveStatus;
  /** Hit rate in percent (0–100), or null if not computable */
  value: number | null;
  /** Preformatted string for display, e.g. "78%" or "n/a" */
  formatted: string;
  /** Optional meta details for miniTable / drawer */
  meta?: HitRateOfExpectedMoveMeta;
  /** Human-readable info (e.g., "Based on last 27 intervals") */
  message?: string;
  /** Error details (for debugging / drawer) when status === "error" */
  errorMessage?: string | null;
}

export interface UseHitRateOfExpectedMoveOptions {
  /** Horizon in days for the expected move (default 1) */
  horizonDays?: number;
  /** Lookback window in days for start points (default 30) */
  lookbackDays?: number;
}

/**
 * Hook: Hit Rate of Expected Move
 *
 * For each day t in the lookback window, compute:
 *   EM_t = S_t * IV_t * sqrt(horizonDays / 365)
 *   RM_t = |S_{t+horizonDays} - S_t|
 *
 * Count a "hit" if RM_t ≤ EM_t. Hit rate = hits / total * 100.
 *
 * Uses:
 *   - fetchDvolHistory(currency, limit, 86400) for IV (DVOL)
 *   - fetchPerpHistory(currency, limit, 86400) for spot proxy (PERPETUAL)
 */
export function useHitRateOfExpectedMoveKpi(
  currency: "BTC" | "ETH",
  opts: UseHitRateOfExpectedMoveOptions = {}
): HitRateOfExpectedMoveKpiViewModel {
  const horizonDays = opts.horizonDays ?? 1;
  const lookbackDays = opts.lookbackDays ?? 30;

  const [state, setState] = useState<HitRateOfExpectedMoveKpiViewModel>({
    status: "loading",
    value: null,
    formatted: "…",
    message: undefined,
    errorMessage: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState((prev) => ({
        ...prev,
        status: "loading",
        // keep previous value/format while refreshing
      }));

      try {
        // Small safety margin for historical data
        const limit = lookbackDays + horizonDays + 4;

        const [ivSeries, priceSeries] = await Promise.all([
          fetchDvolHistory(currency, limit, 86400), // daily DVOL
          fetchPerpHistory(currency, limit, 86400), // daily PERPETUAL
        ]);

        const result = computeHitRateOfExpectedMove(
          ivSeries,
          priceSeries,
          horizonDays,
          lookbackDays
        );

        if (cancelled) return;

        const hitRate = result.hitRatePct;
        const isFiniteHitRate =
          typeof hitRate === "number" && Number.isFinite(hitRate);

        const formatted = isFiniteHitRate
          ? `${hitRate.toFixed(0)}%`
          : "n/a";

        const message =
          result.total > 0
            ? `Based on last ${result.total} intervals`
            : "Insufficient data for hit rate";

        setState({
          status: "ready",
          value: isFiniteHitRate ? hitRate : null,
          formatted,
          meta: {
            hits: result.hits,
            misses: result.misses,
            total: result.total,
            horizonDays,
            lookbackDays,
          },
          message,
          errorMessage: null,
        });
      } catch (err: any) {
        if (cancelled) return;

        setState({
          status: "error",
          value: null,
          formatted: "n/a",
          meta: undefined,
          message: "Failed to load Hit Rate of Expected Move",
          errorMessage: err?.message ?? String(err),
        });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [currency, horizonDays, lookbackDays]);

  return state;
}

/* ------------------------------------------------------------------------- */
/* Internal helpers                                                          */
/* ------------------------------------------------------------------------- */

interface DailyMergedPoint {
  dayKey: number; // days since epoch
  spot: number | null;
  ivPct: number | null; // annualized IV in percent (0–100)
}

interface HitRateCalcResult {
  hitRatePct: number;
  hits: number;
  misses: number;
  total: number;
}

/**
 * Core calculation using raw series from deribit.ts.
 * Kept pure so it’s easy to test in isolation.
 */
function computeHitRateOfExpectedMove(
  ivSeries: DvolPoint[],
  priceSeries: PriceCandle[],
  horizonDays: number,
  lookbackDays: number
): HitRateCalcResult {
  if (horizonDays <= 0) {
    throw new Error("horizonDays must be >= 1");
  }
  if (lookbackDays <= 0) {
    throw new Error("lookbackDays must be >= 1");
  }

  const merged = mergeDailyIvAndSpot(ivSeries, priceSeries);

  if (merged.length === 0) {
    return { hitRatePct: NaN, hits: 0, misses: 0, total: 0 };
  }

  // Trim to last (lookbackDays + horizonDays + 1) calendar days to avoid
  // over-processing, but keep enough for the horizon offset.
  const maxWindow = lookbackDays + horizonDays + 1;
  const trimmed =
    merged.length > maxWindow
      ? merged.slice(merged.length - maxWindow)
      : merged;

  let hits = 0;
  let total = 0;

  const n = trimmed.length;
  // We evaluate intervals [i -> i + horizonDays]
  // Restrict to start points roughly within the last lookbackDays.
  const maxStartIdx = n - horizonDays;
  const minStartIdx = Math.max(0, maxStartIdx - lookbackDays);

  for (let i = minStartIdx; i < maxStartIdx; i++) {
    const start = trimmed[i];
    const end = trimmed[i + horizonDays];

    if (
      !isFiniteNumber(start.spot) ||
      !isFiniteNumber(start.ivPct) ||
      !isFiniteNumber(end.spot)
    ) {
      continue;
    }

    const spotStart = start.spot!;
    const spotEnd = end.spot!;
    const ivAnnual = start.ivPct! / 100; // to decimal

    const em =
      spotStart * ivAnnual * Math.sqrt(horizonDays / 365); // expected move
    const rm = Math.abs(spotEnd - spotStart); // realized move

    total += 1;
    if (rm <= em) hits += 1;
  }

  const hitRatePct = total > 0 ? (hits / total) * 100 : NaN;

  return {
    hitRatePct,
    hits,
    misses: total - hits,
    total,
  };
}

/**
 * Merge DVOL points and PERPETUAL closes into daily buckets.
 *
 * We align by "day key" (days since epoch) to be robust against small
 * timestamp differences between the two feeds.
 */
function mergeDailyIvAndSpot(
  ivSeries: DvolPoint[],
  priceSeries: PriceCandle[]
): DailyMergedPoint[] {
  const byDay = new Map<number, DailyMergedPoint>();

  const dayKey = (ts: number) =>
    Math.floor((typeof ts === "number" ? ts : 0) / 86_400_000); // 24 * 60 * 60 * 1000

  for (const iv of ivSeries) {
    const key = dayKey(iv.ts);
    const existing = byDay.get(key) ?? {
      dayKey: key,
      spot: null,
      ivPct: null,
    };
    if (isFiniteNumber(iv.closePct)) {
      existing.ivPct = iv.closePct;
    }
    byDay.set(key, existing);
  }

  for (const p of priceSeries) {
    const key = dayKey(p.ts);
    const existing = byDay.get(key) ?? {
      dayKey: key,
      spot: null,
      ivPct: null,
    };
    if (isFiniteNumber(p.close)) {
      existing.spot = p.close;
    }
    byDay.set(key, existing);
  }

  return Array.from(byDay.values())
    .filter((p) => p.spot != null || p.ivPct != null)
    .sort((a, b) => a.dayKey - b.dayKey);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
