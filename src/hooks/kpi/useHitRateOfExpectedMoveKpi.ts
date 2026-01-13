import { useEffect, useState } from "react";
import {
  fetchDvolHistory,
  fetchPerpHistory,
  DvolPoint,
  PriceCandle,
} from "../../services/deribit";
import { emAbsFromSpotIv } from "../../lib/expectedMoveMath";

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

export type TimeToFirstBreachStatus = HitRateOfExpectedMoveStatus;

export interface TimeToFirstBreachMeta {
  /** Number of intervals actually evaluated */
  total: number;
  /** Intervals where EM was breached at least once within the horizon */
  withBreach: number;
  /** Intervals with no EM breach within the horizon */
  withoutBreach: number;
  /** Average time to first breach among breaching intervals (0–100%), NaN if no breaches */
  avgBreachTimePct: number;
  /** Horizon in calendar days used for EM & breach search */
  horizonDays: number;
  /** Intended lookback window (start points) in days */
  lookbackDays: number;
}

export interface TimeToFirstBreachKpiViewModel {
  status: TimeToFirstBreachStatus;
  /** Average time to first breach in percent of trade life, or null if not computable */
  value: number | null;
  formatted: string;
  meta?: TimeToFirstBreachMeta;
  message?: string;
  errorMessage?: string | null;
}

export interface UseTimeToFirstBreachOptions {
  horizonDays?: number;
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

export function useTimeToFirstBreachKpi(
    currency: "BTC" | "ETH",
    opts: UseTimeToFirstBreachOptions = {}
  ): TimeToFirstBreachKpiViewModel {
    const horizonDays = opts.horizonDays ?? 1;
    const lookbackDays = opts.lookbackDays ?? 30;
  
    const [state, setState] = useState<TimeToFirstBreachKpiViewModel>({
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
        }));
  
        try {
          const limit = lookbackDays + horizonDays + 4;
  
          const [ivSeries, priceSeries] = await Promise.all([
            fetchDvolHistory(currency, limit, 86400),
            fetchPerpHistory(currency, limit, 86400),
          ]);
  
          if (cancelled) return;
  
          const merged = mergeDailyIvAndSpot(ivSeries, priceSeries);
  
          const result = computeTimeToFirstBreachFromMerged(
            merged,
            horizonDays,
            lookbackDays
          );
  
          if (cancelled) return;
  
          const avg = result.avgBreachTimePct;
          const isFiniteAvg =
            typeof avg === "number" && Number.isFinite(avg);
  
          const formatted = isFiniteAvg ? `${avg.toFixed(0)}%` : "n/a";
  
          const message =
            result.total > 0
              ? `Based on last ${result.total} intervals (${result.withBreach} with breach)`
              : "Insufficient data for Time to First Breach";
  
          setState({
            status: "ready",
            value: isFiniteAvg ? avg : null,
            formatted,
            meta: {
              total: result.total,
              withBreach: result.withBreach,
              withoutBreach: result.withoutBreach,
              avgBreachTimePct: avg,
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
            message: "Failed to load Time to First Breach",
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

interface TimeToFirstBreachCalcResult {
  /** Average time to first breach among breaching intervals (0–100%), NaN if no breaches */
  avgBreachTimePct: number;
  /** Number of evaluated start intervals */
  total: number;
  /** Intervals where EM was breached at least once within the horizon */
  withBreach: number;
  /** Intervals with no EM breach within the horizon */
  withoutBreach: number;
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

    const em = emAbsFromSpotIv(spotStart, ivAnnual, horizonDays);
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
 * Core calculation for "Time to First Breach" using the merged daily series.
 *
 * For each eligible start index i:
 *   - Compute EM based on spot & IV at i for the given horizonDays
 *   - Walk forward j = i1..ihorizonDays until we find the first day where
 *     |S_j - S_i| > EM
 *   - Record τ = (j - i) / horizonDays as the normalized time to first breach
 *
 * We then define:
 *   avgBreachTimePct = mean(τ for breaching intervals) * 100
 */
function computeTimeToFirstBreachFromMerged(
  merged: DailyMergedPoint[],
  horizonDays: number,
  lookbackDays: number
): TimeToFirstBreachCalcResult {
  if (horizonDays <= 0) {
    throw new Error("horizonDays must be >= 1");
  }
  if (lookbackDays <= 0) {
    throw new Error("lookbackDays must be >= 1");
  }

  if (merged.length === 0) {
    return {
      avgBreachTimePct: NaN,
      total: 0,
      withBreach: 0,
      withoutBreach: 0,
    };
  }

  // We only need (lookbackDays + horizonDays + 1) most recent days
  const maxWindow = lookbackDays + horizonDays + 1;
  const trimmed =
    merged.length > maxWindow
      ? merged.slice(merged.length - maxWindow)
      : merged;

  const n = trimmed.length;
  const maxStartIdx = n - horizonDays;
  const minStartIdx = Math.max(0, maxStartIdx - lookbackDays);

  let total = 0;
  let withBreach = 0;
  let sumFraction = 0;

  for (let i = minStartIdx; i < maxStartIdx; i++) {
    const start = trimmed[i];

    if (!isFiniteNumber(start.spot) || !isFiniteNumber(start.ivPct)) {
      continue;
    }

    const spotStart = start.spot!;
    const ivAnnual = start.ivPct! / 100;

    const em = emAbsFromSpotIv(spotStart, ivAnnual, horizonDays);

    let breached = false;

    // Walk forward up to horizonDays steps
    for (let step = 1; step <= horizonDays; step++) {
      const idx = i + step;
      if (idx >= n) break;

      const point = trimmed[idx];
      if (!isFiniteNumber(point.spot)) {
        continue;
      }

      const rm = Math.abs(point.spot! - spotStart);
      if (rm > em) {
        breached = true;
        const fraction = step / horizonDays; // 0–1
        sumFraction += fraction;
        break;
      }
    }

    total += 1;
    if (breached) {
      withBreach += 1;
    }
  }

  const withoutBreach = total - withBreach;
  const avgFraction = withBreach > 0 ? sumFraction / withBreach : NaN;
  const avgBreachTimePct = Number.isFinite(avgFraction)
    ? avgFraction * 100
    : NaN;

  return {
    avgBreachTimePct,
    total,
    withBreach,
    withoutBreach,
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
