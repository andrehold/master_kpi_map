// src/hooks/useStrikeMap.ts
import { useMemo } from "react";
import { useDeribitPerpMark } from "@/hooks/useDeribitPerpMark";
import { useGammaWalls } from "@/hooks/useGammaWalls";
import { useOpenInterestConcentration } from "@/hooks/useOpenInterestConcentration";
import {
  StrikeLevelKind,
  StrikeMapBucket,
  StrikeMapState,
  StrikeMapTableRow,
} from "@/kpi/strikeMapTypes";

export interface UseStrikeMapOptions {
  currency?: "BTC" | "ETH";
  windowPct?: number; // +/- percentage window around spot, e.g. 0.15 = ±15%
  topN?: number;      // number of support/resistance levels for the mini table
}

/**
 * Combines gamma walls + OI concentration into a unified "strike map":
 * - finds the strongest "pin" strike
 * - identifies main support / resistance strikes
 * - returns normalized buckets for a compact heat strip
 * - returns rows for the miniTable (support / resistance sections)
 */
export function useStrikeMap({
  currency = "BTC",
  windowPct = 0.15,
  topN = 3,
}: UseStrikeMapOptions = {}): StrikeMapState {
  // --- 1) Raw inputs from existing hooks -----------------------------------

  const {
    mark: spot,
    loading: markLoading,
    error: markError,
  } = useDeribitPerpMark({ currency });

  const {
    walls: rawWalls,
    loading: gammaLoading,
    error: gammaError,
  } = useGammaWalls({ currency, windowPct, topN: 50, pollMs: 0 } as any);

  const {
    levels: rawOiLevels,
    loading: oiLoading,
    error: oiError,
  } = useOpenInterestConcentration({ currency } as any);

  const loading = markLoading || gammaLoading || oiLoading;

  const error =
    (markError as string | null) ||
    (gammaError as string | null) ||
    (oiError as string | null) ||
    null;

  // --- 2) Derived state -----------------------------------------------------

  return useMemo<StrikeMapState>(() => {
    if (!spot || loading) {
      return {
        loading,
        error,
        pinStrike: null,
        pinDistancePct: null,
        mainSupportStrike: null,
        mainResistanceStrike: null,
        buckets: [],
        tableRows: [],
      };
    }

    type Entry = {
      strike: number;
      gammaNotional: number;
      callOi: number;
      putOi: number;
    };

    const entriesByStrike = new Map<number, Entry>();

    const windowLow = spot * (1 - windowPct);
    const windowHigh = spot * (1 + windowPct);

    const getEntry = (strike: number): Entry => {
      let existing = entriesByStrike.get(strike);
      if (!existing) {
        existing = { strike, gammaNotional: 0, callOi: 0, putOi: 0 };
        entriesByStrike.set(strike, existing);
      }
      return existing;
    };

    // 2a) Fold in gamma walls
    // TODO: adapt to your actual gamma wall shape
    const wallsArray: any[] = Array.isArray(rawWalls) ? (rawWalls as any[]) : [];
    for (const wall of wallsArray) {
      const strike = (wall as any).strike as number | undefined;
      if (typeof strike !== "number") continue;
      if (strike < windowLow || strike > windowHigh) continue;

      const e = getEntry(strike);
      const gammaSize =
        Math.abs(
          (wall as any).gammaNotional ??
          (wall as any).gammaAbs ??
          (wall as any).size ??
          0,
        ) || 0;

      e.gammaNotional += gammaSize;
    }

    // 2b) Fold in OI levels
    // TODO: adapt to your actual OI level shape
    const levelsArray: any[] = Array.isArray(rawOiLevels) ? (rawOiLevels as any[]) : [];
    for (const level of levelsArray) {
      const strike = (level as any).strike as number | undefined;
      if (typeof strike !== "number") continue;
      if (strike < windowLow || strike > windowHigh) continue;

      const e = getEntry(strike);
      const callOi =
        (level as any).callOi ??
        (level as any).calls ??
        (level as any).callOpenInterest ??
        0;
      const putOi =
        (level as any).putOi ??
        (level as any).puts ??
        (level as any).putOpenInterest ??
        0;

      e.callOi += Number(callOi) || 0;
      e.putOi += Number(putOi) || 0;
    }

    const entries = Array.from(entriesByStrike.values()).sort(
      (a, b) => a.strike - b.strike,
    );

    if (!entries.length) {
      return {
        loading: false,
        error,
        pinStrike: null,
        pinDistancePct: null,
        mainSupportStrike: null,
        mainResistanceStrike: null,
        buckets: [],
        tableRows: [],
      };
    }

    // --- 3) Normalize scores & classify each strike ------------------------

    const maxGamma = entries.reduce(
      (m, e) => Math.max(m, e.gammaNotional),
      0,
    );
    const maxOi = entries.reduce(
      (m, e) => Math.max(m, e.callOi + e.putOi),
      0,
    );

    const GAMMA_WEIGHT = 0.7;
    const OI_WEIGHT = 0.3;

    const buckets: StrikeMapBucket[] = [];
    const supports: { entry: Entry; score: number }[] = [];
    const resistances: { entry: Entry; score: number }[] = [];

    const nearSpotThreshold = spot * 0.0025; // ~0.25%

    for (const e of entries) {
      const totalOi = e.callOi + e.putOi;
      const gammaNorm = maxGamma > 0 ? e.gammaNotional / maxGamma : 0;
      const oiNorm = maxOi > 0 ? totalOi / maxOi : 0;

      const score =
        GAMMA_WEIGHT * gammaNorm +
        OI_WEIGHT * oiNorm;

      let kind: StrikeLevelKind | "none" = "none";

      const distance = Math.abs(e.strike - spot);
      const isNearSpot = distance <= nearSpotThreshold;

      if (isNearSpot && score > 0.2) {
        kind = "magnet";
      } else if (e.strike < spot && e.putOi >= e.callOi && score > 0.05) {
        kind = "support";
      } else if (e.strike > spot && e.callOi >= e.putOi && score > 0.05) {
        kind = "resistance";
      }

      buckets.push({
        strike: e.strike,
        score: Math.max(0, Math.min(1, score)),
        kind,
      });

      if (kind === "support") supports.push({ entry: e, score });
      if (kind === "resistance") resistances.push({ entry: e, score });
    }

    // --- 4) Derive main support / resistance & pin strike ------------------

    supports.sort((a, b) => b.score - a.score);
    resistances.sort((a, b) => b.score - a.score);

    const mainSupportStrike =
      supports.length > 0 ? supports[0].entry.strike : null;

    const mainResistanceStrike =
      resistances.length > 0 ? resistances[0].entry.strike : null;

    let pinStrike: number | null = null;
    let pinScore = -Infinity;
    let pinDistance = Infinity;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const bucket = buckets[i];
      const s = bucket?.score ?? 0;

      const distance = Math.abs(e.strike - spot);
      const betterScore = s > pinScore + 1e-6;
      const sameScoreCloser = Math.abs(s - pinScore) <= 1e-6 && distance < pinDistance;

      if (betterScore || sameScoreCloser) {
        pinStrike = e.strike;
        pinScore = s;
        pinDistance = distance;
      }
    }

    const pinDistancePct =
      pinStrike != null
        ? Math.abs(pinStrike / spot - 1) * 100
        : null;

    // --- 5) Build miniTable rows -------------------------------------------

    const tableRows: StrikeMapTableRow[] = [];

    const takeSupport = supports.slice(0, topN);
    const takeResistance = resistances.slice(0, topN);

    takeSupport.forEach((s, idx) => {
      tableRows.push({
        section: "support",
        label: idx === 0 ? "Major support" : `Support #${idx + 1}`,
        strike: s.entry.strike,
        score: s.score,
      });
    });

    takeResistance.forEach((r, idx) => {
      tableRows.push({
        section: "resistance",
        label: idx === 0 ? "Major resistance" : `Resistance #${idx + 1}`,
        strike: r.entry.strike,
        score: r.score,
      });
    });

    return {
      loading: false,
      error,
      pinStrike,
      pinDistancePct,
      mainSupportStrike,
      mainResistanceStrike,
      buckets,
      tableRows,
    };
  }, [spot, rawWalls, rawOiLevels, windowPct, topN, loading, error]);
}
