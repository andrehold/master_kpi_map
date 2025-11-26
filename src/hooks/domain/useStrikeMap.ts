import { useMemo } from "react";
import type {
  StrikeMapState,
  StrikeMapBucket,
  StrikeMapTableRow,
} from "../../kpi/strikeMapTypes";

export interface StrikeMapSourcePoint {
  strike: number;
  /** Absolute gamma exposure in USD (or normalized units). */
  gammaAbs?: number;
  /** Signed gamma exposure (for call/put dominance, optional). */
  gammaSigned?: number;
  /** Open interest size (contracts or normalized). */
  oiAbs?: number;
}

/**
 * Parameters for deriving a StrikeMapState from combined gamma + OI data.
 */
export interface UseStrikeMapParams {
  /** Current underlying spot. Used to classify levels into support/resistance/magnet. */
  spot?: number | null;
  /**
   * Window size expressed as a fraction of spot.
   * Example: 0.05 = ±5% window around spot. Defaults to 0.05.
   */
  windowPct?: number;
  /** Upstream loading flag (e.g. gammaWalls.loading || oiConcentration.loading). */
  loading: boolean;
  /** Upstream error, if any. */
  error: string | null;
  /** Combined data points built from gamma walls + OI concentration. */
  points: StrikeMapSourcePoint[];
}

const DEFAULT_WINDOW_PCT = 0.05;
const MIN_SCORE = 0.15;
const GAMMA_WEIGHT = 0.6;
const OI_WEIGHT = 0.4;
const MAX_LEVELS_PER_SIDE = 3;

/**
 * React hook wrapper around the pure builder. Keeps the heavy lifting in a memo.
 */
export function useStrikeMapFromPoints(params: UseStrikeMapParams): StrikeMapState {
  // If you want aggressive perf you can destructure instead of `[params]`,
  // but this is fine for now.
  return useMemo(() => buildStrikeMapStateFromPoints(params), [params]);
}

/**
 * Pure function: derive StrikeMapState from generic gamma/OI input.
 */
export function buildStrikeMapStateFromPoints(params: UseStrikeMapParams): StrikeMapState {
  const { spot, windowPct = DEFAULT_WINDOW_PCT, loading, error, points } = params;

  const base: StrikeMapState = {
    loading,
    error,
    pinStrike: null,
    pinDistancePct: null,
    mainSupportStrike: null,
    mainResistanceStrike: null,
    buckets: [],
    tableRows: [],
  };

  if (!points || points.length === 0) {
    return base;
  }

  // If we don't know spot we can still compute scores, but can't say support/resistance.
  if (spot == null || !Number.isFinite(spot)) {
    const { buckets } = scoreBucketsWithoutSpot(points);
    return {
      ...base,
      buckets,
    };
  }

  const window = Math.abs(spot) * windowPct;
  const lower = spot - window;
  const upper = spot + window;

  // Aggregate by strike and keep only strikes in window.
  const aggregated = aggregatePoints(points).filter(
    (p) => p.strike >= lower && p.strike <= upper,
  );

  if (aggregated.length === 0) {
    return base;
  }

  // Normalize gamma / OI components.
  let maxGammaAbs = 0;
  let maxOiAbs = 0;
  for (const p of aggregated) {
    if (p.gammaAbs > maxGammaAbs) maxGammaAbs = p.gammaAbs;
    if (p.oiAbs > maxOiAbs) maxOiAbs = p.oiAbs;
  }

  const buckets: StrikeMapBucket[] = aggregated.map((p) => {
    const gammaScore =
      maxGammaAbs > 0 && p.gammaAbs > 0 ? p.gammaAbs / maxGammaAbs : 0;
    const oiScore = maxOiAbs > 0 && p.oiAbs > 0 ? p.oiAbs / maxOiAbs : 0;
    const score = GAMMA_WEIGHT * gammaScore + OI_WEIGHT * oiScore;

    let kind: StrikeMapBucket["kind"] = "none";

    if (score >= MIN_SCORE) {
      const distance = (p.strike - spot) / spot;
      const absDistance = Math.abs(distance);

      // Close to spot → "magnet", otherwise classify purely by side.
      if (absDistance < windowPct * 0.25) {
        kind = "magnet";
      } else {
        kind = p.strike < spot ? "support" : "resistance";
      }
    }

    return {
      strike: p.strike,
      score,
      kind,
    };
  });

  // Derive pin / main support / main resistance from buckets.
  const supportBuckets = buckets.filter((b) => b.kind === "support");
  const resistanceBuckets = buckets.filter((b) => b.kind === "resistance");
  const magnetBuckets = buckets.filter((b) => b.kind === "magnet");
  const srBuckets = buckets.filter(
    (b) => b.kind === "support" || b.kind === "resistance",
  );

  const pinBucket =
    magnetBuckets.length > 0
      ? maxByScore(magnetBuckets)
      : srBuckets.length > 0
        ? maxByScore(srBuckets)
        : null;

  const pinStrike = pinBucket ? pinBucket.strike : null;
  const pinDistancePct =
    pinBucket && spot ? (pinBucket.strike - spot) / spot : null;

  const mainSupport = supportBuckets.length > 0 ? maxByScore(supportBuckets) : null;
  const mainResistance =
    resistanceBuckets.length > 0 ? maxByScore(resistanceBuckets) : null;

  const mainSupportStrike = mainSupport ? mainSupport.strike : null;
  const mainResistanceStrike = mainResistance ? mainResistance.strike : null;

  const tableRows: StrikeMapTableRow[] = [];

  const sortedSupports = [...supportBuckets]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LEVELS_PER_SIDE);

  const sortedResistances = [...resistanceBuckets]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LEVELS_PER_SIDE);

  sortedSupports.forEach((b, idx) => {
    tableRows.push({
      section: "support",
      label: idx === 0 ? "Main support" : `Support #${idx + 1}`,
      strike: b.strike,
      score: b.score,
    });
  });

  sortedResistances.forEach((b, idx) => {
    tableRows.push({
      section: "resistance",
      label: idx === 0 ? "Main resistance" : `Resistance #${idx + 1}`,
      strike: b.strike,
      score: b.score,
    });
  });

  return {
    ...base,
    pinStrike,
    pinDistancePct,
    mainSupportStrike,
    mainResistanceStrike,
    buckets,
    tableRows,
  };
}

/**
 * Aggregate multiple source points for the same strike.
 */
function aggregatePoints(
  points: StrikeMapSourcePoint[],
): Array<{
  strike: number;
  gammaAbs: number;
  gammaSigned: number;
  oiAbs: number;
}> {
  const byStrike = new Map<
    number,
    { gammaAbs: number; gammaSigned: number; oiAbs: number }
  >();

  for (const p of points) {
    if (!Number.isFinite(p.strike)) continue;
    const existing =
      byStrike.get(p.strike) ?? { gammaAbs: 0, gammaSigned: 0, oiAbs: 0 };

    const gammaAbs = p.gammaAbs ?? 0;
    const gammaSigned = p.gammaSigned ?? 0;
    const oiAbs = p.oiAbs ?? 0;

    existing.gammaAbs += Math.abs(gammaAbs);
    existing.gammaSigned += gammaSigned;
    existing.oiAbs += Math.abs(oiAbs);

    byStrike.set(p.strike, existing);
  }

  return Array.from(byStrike.entries()).map(([strike, agg]) => ({
    strike,
    gammaAbs: agg.gammaAbs,
    gammaSigned: agg.gammaSigned,
    oiAbs: agg.oiAbs,
  }));
}

/**
 * Fallback scoring when no spot is available:
 * only fill buckets with scores and "none"/"magnet" kinds.
 */
function scoreBucketsWithoutSpot(
  points: StrikeMapSourcePoint[],
): { buckets: StrikeMapBucket[] } {
  const aggregated = aggregatePoints(points);
  if (aggregated.length === 0) {
    return { buckets: [] };
  }

  let maxGammaAbs = 0;
  let maxOiAbs = 0;
  for (const p of aggregated) {
    if (p.gammaAbs > maxGammaAbs) maxGammaAbs = p.gammaAbs;
    if (p.oiAbs > maxOiAbs) maxOiAbs = p.oiAbs;
  }

  const buckets: StrikeMapBucket[] = aggregated.map((p) => {
    const gammaScore =
      maxGammaAbs > 0 && p.gammaAbs > 0 ? p.gammaAbs / maxGammaAbs : 0;
    const oiScore = maxOiAbs > 0 && p.oiAbs > 0 ? p.oiAbs / maxOiAbs : 0;
    const score = GAMMA_WEIGHT * gammaScore + OI_WEIGHT * oiScore;

    return {
      strike: p.strike,
      score,
      kind: score >= MIN_SCORE ? "magnet" : "none",
    };
  });

  return { buckets };
}

function maxByScore<T extends { score: number }>(items: T[]): T {
  return items.reduce(
    (best, item) => (item.score > best.score ? item : best),
    items[0],
  );
}
