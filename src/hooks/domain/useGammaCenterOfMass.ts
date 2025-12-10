// src/hooks/domain/useGammaCenterOfMass.ts
import { useMemo } from "react";
import { useDeribitIndexPrice } from "./useDeribitIndexPrice";
import { useGammaWalls, type GammaByStrike } from "./useGammaWalls";

export type GammaComSide = "upside" | "downside" | "pinned" | "unknown";

/** Gravity band half-width as a fraction of spot (e.g. 0.05 = ±5%) */
const GRAVITY_BAND = 0.05; // use 0.10 for ±10%, etc.

export interface GammaCenterOfMassValue {
  hasData: boolean;
  kCom: number | null;
  distancePct: number | null; // (K_COM - spot) / spot * 100
  side: GammaComSide;
  /** Fraction of gamma weight within the gravity band around spot (0..1). */
  gravityShare: number | null;
}

export interface GammaCenterOfMassDomainState {
  loading: boolean;
  error: string | null;
  spot: number | null;
  value: GammaCenterOfMassValue;
  bucketLabel: string;
  refresh: () => void;
}

/**
 * Domain-level hook:
 * - pulls spot from useDeribitIndexPrice (with polling disabled)
 * - pulls gamma-by-strike from useGammaWalls (with polling disabled)
 * - compresses the gamma surface into a single "center of mass" strike
 * - returns distance vs spot in %
 *
 * NOTE: we only use one React hook (useMemo) here,
 * so the hook order is stable and safe.
 */
export function useGammaCenterOfMass(): GammaCenterOfMassDomainState {
  // 🔹 Index price: one-shot + manual refresh (pollMs = 0)
  // Passing `undefined as any` lets the hook use its default currency
  // but with a custom poll interval.
  const {
    price: spotFromIndex,
    loading: spotLoading,
    error: spotError,
    refresh: refreshSpot,
  } = useDeribitIndexPrice(undefined as any, 0);

  // 🔹 Gamma walls: one-shot + manual refresh (pollMs = 0)
  const {
    data: gammaData,
    indexPrice: spotFromWalls,
    loading: gammaLoading,
    error: gammaError,
    refresh: refreshWalls,
  } = useGammaWalls({ pollMs: 0 });

  const loading = Boolean(spotLoading) || Boolean(gammaLoading);
  const error: string | null = spotError ?? gammaError ?? null;

  // Prefer the same index price the gamma hook uses; fall back to index hook
  const spot: number | null =
    (typeof spotFromWalls === "number" ? spotFromWalls : null) ??
    (typeof spotFromIndex === "number" ? spotFromIndex : null) ??
    null;

  const bucketLabel = "Bucket: 7–45D, weighted by e^{-T/30}";

  const value: GammaCenterOfMassValue = useMemo(() => {
    if (loading || error || spot == null) {
      return {
        hasData: false,
        kCom: null,
        distancePct: null,
        side: "unknown",
        gravityShare: null,
      };
    }

    const rows: GammaByStrike[] = Array.isArray(gammaData)
      ? (gammaData as GammaByStrike[])
      : [];

    if (!rows.length) {
      return {
        hasData: false,
        kCom: null,
        distancePct: null,
        side: "unknown",
        gravityShare: null,
      };
    }

    let weightSum = 0;
    let weightedStrikeSum = 0;
    let gravityWeightSum = 0;

    for (const row of rows) {
      // be defensive about field names
      const strike: number | undefined =
        (row as any).strike ?? (row as any).k ?? (row as any).strikePrice;

      // same weights you already use for Γ-COM
      const magRaw: number =
        (row as any).gex_abs_usd ??
        (row as any).gex_net_usd ??
        (row as any).gamma ??
        (row as any).gammaUsd ??
        (row as any).totalGamma ??
        0;

      const gammaAbs: number = Math.abs(
        typeof magRaw === "number" ? magRaw : 0
      );

      if (
        typeof strike !== "number" ||
        !Number.isFinite(strike) ||
        !Number.isFinite(gammaAbs) ||
        gammaAbs <= 0
      ) {
        continue;
      }

      const w = gammaAbs;
      weightSum += w;
      weightedStrikeSum += w * strike;

      const relDist = Math.abs(strike - spot) / spot;
      if (Number.isFinite(relDist) && relDist <= GRAVITY_BAND) {
        gravityWeightSum += w;
      }
    }

    if (weightSum === 0) {
      return {
        hasData: false,
        kCom: null,
        distancePct: null,
        side: "unknown",
        gravityShare: null,
      };
    }

    const kCom = weightedStrikeSum / weightSum;
    const distancePct = ((kCom - spot) / spot) * 100;
    const gravityShare = weightSum > 0 ? gravityWeightSum / weightSum : null;

    let side: GammaComSide = "unknown";
    if (Number.isFinite(distancePct)) {
      const abs = Math.abs(distancePct as number);
      if (abs < 0.75) side = "pinned";
      else if ((distancePct as number) > 0) side = "upside";
      else side = "downside";
    }

    return {
      hasData: true,
      kCom,
      distancePct,
      side,
      gravityShare,
    };
  }, [loading, error, spot, gammaData]);

  // Manual refresh: run both underlying refresh functions.
  // No useCallback here – just a plain function, so no new hook.
  const refresh = () => {
    if (typeof refreshSpot === "function") refreshSpot();
    if (typeof refreshWalls === "function") refreshWalls();
  };

  return {
    loading,
    error,
    spot,
    value,
    bucketLabel,
    refresh,
  };
}
