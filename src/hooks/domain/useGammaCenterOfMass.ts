// hooks/domain/useGammaCenterOfMass.ts
import { useMemo } from "react";
import { useDeribitIndexPrice } from "./useDeribitIndexPrice";
import { useGammaWalls } from "./useGammaWalls";

export type GammaComSide = "upside" | "downside" | "pinned" | "unknown";

export interface GammaCenterOfMassValue {
  hasData: boolean;
  kCom: number | null;
  distancePct: number | null; // (K_COM - spot) / spot * 100
  side: GammaComSide;
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
 * - pulls spot from useDeribitIndexPrice
 * - pulls gamma-by-strike from useGammaWalls
 * - compresses the gamma surface into a single "center of mass" strike
 * - returns distance vs spot in %
 *
 * NOTE: this version only uses gamma (|Γ| as weight). If you later have
 * per-strike OI via OptionInstrument, we can extend the weights to
 * |Γ| * OI * timeWeight without changing the external signature.
 */
export function useGammaCenterOfMass(): GammaCenterOfMassDomainState {
  // domain sources
  const spotState = useDeribitIndexPrice() as any;
  const gammaState = useGammaWalls() as any;

  const loading: boolean =
    Boolean(spotState?.loading) || Boolean(gammaState?.loading);

  const error: string | null =
    (spotState?.error as string | undefined) ??
    (gammaState?.error as string | undefined) ??
    null;

  // prefer the same index the gamma hook uses, fall back to spot hook
  const spot: number | null =
    (gammaState?.indexPrice as number | undefined) ??
    (spotState?.price as number | undefined) ??
    null;

  const bucketLabel = "Gamma COM over current gamma surface";

  const value: GammaCenterOfMassValue = useMemo(() => {
    if (loading || error || spot == null) {
      return {
        hasData: false,
        kCom: null,
        distancePct: null,
        side: "unknown",
      };
    }

    // try gammaState.data first, fall back to gammaState.walls
    const rows: any[] =
      (gammaState?.data as any[]) ?? (gammaState?.walls as any[]) ?? [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        hasData: false,
        kCom: null,
        distancePct: null,
        side: "unknown",
      };
    }

    let weightSum = 0;
    let weightedStrikeSum = 0;

    for (const row of rows) {
      // be defensive about field names
      const strike: number | undefined =
        row.strike ?? row.k ?? row.strikePrice;

      const magRaw: number =
        (row.gex_abs_usd as number | undefined) ??
        (row.gex_net_usd as number | undefined) ??
        (row.gamma as number | undefined) ??
        (row.gammaUsd as number | undefined) ??
        (row.totalGamma as number | undefined) ??
        0;

      const gammaAbs = Math.abs(magRaw);

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
    }

    if (weightSum === 0) {
      return {
        hasData: false,
        kCom: null,
        distancePct: null,
        side: "unknown",
      };
    }

    const kCom = weightedStrikeSum / weightSum;
    const distancePct = ((kCom - spot) / spot) * 100;

    let side: GammaComSide = "unknown";
    if (Number.isFinite(distancePct)) {
      const abs = Math.abs(distancePct);
      if (abs < 0.75) side = "pinned";
      else if (distancePct! > 0) side = "upside";
      else side = "downside";
    }

    return {
      hasData: true,
      kCom,
      distancePct,
      side,
    };
  }, [loading, error, spot, gammaState]);

  const refresh: () => void =
    (gammaState?.refresh as (() => void) | undefined) ??
    (() => {
      /* noop */
    });

  return {
    loading,
    error,
    spot,
    value,
    bucketLabel,
    refresh,
  };
}
