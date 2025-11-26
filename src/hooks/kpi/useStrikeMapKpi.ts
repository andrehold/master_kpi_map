import { useMemo } from "react";
import type { useGammaWalls } from "../domain/useGammaWalls";
import type { useOpenInterestConcentration } from "../domain/useOpenInterestConcentration";
import type {
  StrikeLevelKind,
  StrikeMapBucket,
  StrikeMapState,
  StrikeMapTableRow,
} from "../../kpi/strikeMapTypes";

type GammaWallsState = ReturnType<typeof useGammaWalls>;
type OIConcentrationState = ReturnType<typeof useOpenInterestConcentration>;

export type StrikeMapKpiStatus =
  | "loading"
  | "error"
  | "empty"
  | "ok"
  | "unavailable";

export interface StrikeMapKpiViewModel {
  status: StrikeMapKpiStatus;
  value: string | null;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null;
  table?: {
    title: string;
    rows: StrikeMapTableRow[];
  };
  message?: string;
  errorMessage?: string | null;
}

const DEFAULT_WINDOW_PCT = 0.05;
const SCORE_THRESHOLD = 0.15;
const GAMMA_WEIGHT = 0.6;
const OI_WEIGHT = 0.4;
const MAX_LEVELS_PER_SIDE = 3;

type AggregatedPoint = {
  strike: number;
  gammaAbs: number;
  oiAbs: number;
};

/**
 * Public hook: turn gammaWalls + oiConcentration into a KPI view-model.
 */
export function useStrikeMapKpi(
  gamma: GammaWallsState,
  oi: OIConcentrationState,
  locale: string = "en",
): StrikeMapKpiViewModel {
  return useMemo(() => {
    const state = buildStrikeMapState(gamma, oi);

    if (!state) {
      return {
        status: "unavailable",
        value: null,
        meta: "Strike map unavailable",
        message: "Strike support/resistance is not wired for this context yet.",
      };
    }

    if (state.loading) {
      return {
        status: "loading",
        value: "…",
        meta: "Loading strike map…",
        message: "Building strike support/resistance map…",
      };
    }

    if (state.error) {
      return {
        status: "error",
        value: "—",
        meta: "Error",
        errorMessage: state.error,
      };
    }

    if (!state.buckets.length) {
      return {
        status: "empty",
        value: "—",
        meta: "Awaiting data",
        message: "No significant support/resistance levels in the current window.",
      };
    }

    const fmtPrice = (x: number | null) =>
      x == null
        ? "—"
        : x.toLocaleString(locale, { maximumFractionDigits: 0 });

    const fmtPct = (d: number | null) =>
      d == null ? "" : `${(d * 100).toFixed(2)}%`;

    const { pinStrike, pinDistancePct, mainSupportStrike, mainResistanceStrike } =
      state;

    // Main KPI value: S xxx / R yyy
    let mainValue: string | null = null;
    if (mainSupportStrike != null && mainResistanceStrike != null) {
      mainValue = `S ${fmtPrice(mainSupportStrike)} / R ${fmtPrice(
        mainResistanceStrike,
      )}`;
    } else if (mainSupportStrike != null) {
      mainValue = `S ${fmtPrice(mainSupportStrike)}`;
    } else if (mainResistanceStrike != null) {
      mainValue = `R ${fmtPrice(mainResistanceStrike)}`;
    } else if (pinStrike != null) {
      mainValue = `≈ ${fmtPrice(pinStrike)}`;
    } else {
      mainValue = "—";
    }

    const meta = "Strike support / resistance";

    let extraBadge: string | null = null;
    if (pinStrike != null) {
      extraBadge = `Pin ${fmtPrice(pinStrike)}`;
      if (pinDistancePct != null) {
        const absPct = Math.abs(pinDistancePct * 100).toFixed(2);
        const side = pinDistancePct >= 0 ? "above spot" : "below spot";
        extraBadge = `${extraBadge} (${absPct}% ${side})`;
      }
    }

    const table =
      state.tableRows.length > 0
        ? {
            title: "Key S/R levels",
            rows: state.tableRows,
          }
        : undefined;

    return {
      status: "ok",
      value: mainValue,
      meta,
      extraBadge,
      guidanceValue: pinDistancePct,
      table,
    };
  }, [gamma, oi, locale]);
}

/**
 * Internal: build StrikeMapState from gammaWalls + oiConcentration.
 */
function buildStrikeMapState(
  gamma: GammaWallsState,
  oi: OIConcentrationState,
): StrikeMapState | null {
  if (!gamma && !oi) return null;

  const loading = !!((gamma as any)?.loading || (oi as any)?.loading);
  const rawError =
    ((gamma as any)?.error as string | null | undefined) ??
    ((oi as any)?.error as string | null | undefined) ??
    null;

  const error = rawError ?? null;

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

  if (error) return base;

  // Best-effort spot
  const spot =
    typeof (gamma as any)?.spot === "number"
      ? (gamma as any).spot
      : typeof (gamma as any)?.indexPrice === "number"
        ? (gamma as any).indexPrice
        : typeof (oi as any)?.spot === "number"
          ? (oi as any).spot
          : null;

  const windowPct: number =
    typeof (gamma as any)?.windowPct === "number"
      ? (gamma as any).windowPct
      : DEFAULT_WINDOW_PCT;

  const points = collectAggregatedPoints(gamma, oi, spot, windowPct);
  if (!points.length) {
    return base;
  }

  const buckets = buildBuckets(points, spot, windowPct);
  if (!buckets.length) {
    return base;
  }

  const supportBuckets = buckets.filter((b) => b.kind === "support");
  const resistanceBuckets = buckets.filter((b) => b.kind === "resistance");

  const mainSupport =
    supportBuckets.length > 0
      ? supportBuckets.reduce((best, b) => (b.score > best.score ? b : best))
      : null;

  const mainResistance =
    resistanceBuckets.length > 0
      ? resistanceBuckets.reduce((best, b) => (b.score > best.score ? b : best))
      : null;

  const mainSupportStrike = mainSupport ? mainSupport.strike : null;
  const mainResistanceStrike = mainResistance ? mainResistance.strike : null;

  const srBuckets = buckets.filter(
    (b) => b.kind === "support" || b.kind === "resistance",
  );
  let pinStrike: number | null = null;
  let pinDistancePct: number | null = null;

  if (srBuckets.length > 0) {
    // Highest score, tie-breaker: closest to spot if we have it
    let best = srBuckets[0];
    for (let i = 1; i < srBuckets.length; i++) {
      const b = srBuckets[i];
      if (b.score > best.score) {
        best = b;
      } else if (spot != null && b.score === best.score) {
        const bestDist = Math.abs(best.strike - spot);
        const newDist = Math.abs(b.strike - spot);
        if (newDist < bestDist) best = b;
      }
    }
    pinStrike = best.strike;
    if (spot != null && spot !== 0) {
      pinDistancePct = (best.strike - spot) / spot;
    }
  }

  const tableRows: StrikeMapTableRow[] = [];

  // Top supports / resistances
  const sortedSupports = [...supportBuckets].sort((a, b) => b.score - a.score);
  const sortedResistances = [...resistanceBuckets].sort(
    (a, b) => b.score - a.score,
  );

  sortedSupports.slice(0, MAX_LEVELS_PER_SIDE).forEach((b, idx) => {
    tableRows.push({
      section: "support",
      label: idx === 0 ? "Main support" : `Support #${idx + 1}`,
      strike: b.strike,
      score: b.score,
    });
  });

  sortedResistances.slice(0, MAX_LEVELS_PER_SIDE).forEach((b, idx) => {
    tableRows.push({
      section: "resistance",
      label: idx === 0 ? "Main resistance" : `Resistance #${idx + 1}`,
      strike: b.strike,
      score: b.score,
    });
  });

  return {
    ...base,
    loading,
    error,
    buckets,
    pinStrike,
    pinDistancePct,
    mainSupportStrike,
    mainResistanceStrike,
    tableRows,
  };
}

/**
 * Collect and aggregate gamma + OI by strike inside a window around spot.
 */
function collectAggregatedPoints(
  gamma: GammaWallsState,
  oi: OIConcentrationState,
  spot: number | null,
  windowPct: number,
): AggregatedPoint[] {
  const byStrike = new Map<number, AggregatedPoint>();

  const addPoint = (strike: number, gammaAbs: number, oiAbs: number) => {
    if (!Number.isFinite(strike)) return;

    if (spot != null && windowPct > 0) {
      const distPct = Math.abs(strike - spot) / Math.abs(spot);
      if (distPct > windowPct) return;
    }

    const existing =
      byStrike.get(strike) ?? { strike, gammaAbs: 0, oiAbs: 0 };

    existing.gammaAbs += Math.max(0, gammaAbs);
    existing.oiAbs += Math.max(0, oiAbs);

    byStrike.set(strike, existing);
  };

  // 1) Gamma: try `top` then `walls`
  const gAny: any = gamma as any;
  const gammaRows: any[] =
    Array.isArray(gAny?.top) && gAny.top.length > 0
      ? gAny.top
      : Array.isArray(gAny?.walls)
        ? gAny.walls
        : [];

  for (const row of gammaRows) {
    const s =
      typeof row?.strike === "number"
        ? row.strike
        : Number(row?.strike ?? NaN);
    if (!Number.isFinite(s)) continue;

    const candidates = [
      row?.gexUsd,
      row?.gex_usd,
      row?.gexAbsUsd,
      row?.gex_abs_usd,
      row?.size,
      row?.abs,
    ];

    let gammaAbs = 0;
    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c)) {
        gammaAbs = Math.max(gammaAbs, Math.abs(c));
      }
    }

    if (gammaAbs <= 0) continue;

    addPoint(s, gammaAbs, 0);
  }

  // 2) OI concentration: try common collection names
  const oiAny: any = oi as any;
  const oiRows: any[] =
    Array.isArray(oiAny?.rows) && oiAny.rows.length > 0
      ? oiAny.rows
      : Array.isArray(oiAny?.levels) && oiAny.levels.length > 0
        ? oiAny.levels
        : Array.isArray(oiAny?.top)
          ? oiAny.top
          : [];

  for (const row of oiRows) {
    const s =
      typeof row?.strike === "number"
        ? row.strike
        : Number(row?.strike ?? NaN);
    if (!Number.isFinite(s)) continue;

    const candidates = [
      row?.oiAbs,
      row?.oi_abs,
      row?.abs,
      row?.value,
      row?.size,
      row?.contracts,
    ];

    let oiAbs = 0;
    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c)) {
        oiAbs = Math.max(oiAbs, Math.abs(c));
      }
    }

    if (oiAbs <= 0) continue;

    addPoint(s, 0, oiAbs);
  }

  return Array.from(byStrike.values());
}

/**
 * Turn aggregated points into classified buckets.
 */
function buildBuckets(
  points: AggregatedPoint[],
  spot: number | null,
  windowPct: number,
): StrikeMapBucket[] {
  if (!points.length) return [];

  let maxGamma = 0;
  let maxOi = 0;
  for (const p of points) {
    if (p.gammaAbs > maxGamma) maxGamma = p.gammaAbs;
    if (p.oiAbs > maxOi) maxOi = p.oiAbs;
  }

  const buckets: StrikeMapBucket[] = [];

  for (const p of points) {
    const gammaScore = maxGamma > 0 ? p.gammaAbs / maxGamma : 0;
    const oiScore = maxOi > 0 ? p.oiAbs / maxOi : 0;
    const combined = GAMMA_WEIGHT * gammaScore + OI_WEIGHT * oiScore;

    let kind: StrikeLevelKind | "none" = "none";

    if (combined >= SCORE_THRESHOLD) {
      if (spot == null || spot === 0) {
        kind = "magnet";
      } else {
        const distPct = Math.abs(p.strike - spot) / Math.abs(spot);
        if (distPct < windowPct * 0.25) {
          kind = "magnet";
        } else {
          kind = p.strike < spot ? "support" : "resistance";
        }
      }
    }

    buckets.push({
      strike: p.strike,
      score: combined,
      kind,
    });
  }

  return buckets;
}
