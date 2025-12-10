// src/hooks/kpi/useGammaCenterOfMassKpi.ts
import {
  useGammaCenterOfMass,
  type GammaComSide,
} from "../domain/useGammaCenterOfMass";

export type GammaCenterOfMassKpiViewModel = {
  /** "loading" / "error" / "ready" – same pattern as useVixKpi */
  status: "loading" | "error" | "ready";
  /** Formatted main display, e.g. "+4.2%" (or null if no number yet) */
  value: string | null;
  /** Raw distance vs spot in %, used for guidance bands */
  guidanceValue: number | null;
  /** Secondary line, e.g. "K_COM 68,500 vs Spot 65,700 · 7–45D, e^{-T/30}" */
  meta?: string;
  /** Short tag, e.g. "Heavier upside structure" */
  extraBadge?: string | null;
  /** Error text for the card to show */
  errorMessage?: string;
  /** Allows manual reload from the UI later if you ever want it */
  reload: () => void;
};

function describeSide(side: GammaComSide, distancePct: number | null): string | null {
  if (distancePct == null || !Number.isFinite(distancePct)) return null;

  switch (side) {
    case "pinned":
      return "Structurally heavy here";
    case "upside":
      return "Heavier upside structure";
    case "downside":
      return "Heavier downside structure";
    default:
      return null;
  }
}

export function useGammaCenterOfMassKpi(): GammaCenterOfMassKpiViewModel {
  const { loading, error, spot, value, bucketLabel, refresh } =
    useGammaCenterOfMass();

  const distanceRaw = value?.distancePct;
  const hasDistance =
    typeof distanceRaw === "number" && Number.isFinite(distanceRaw);

  const status: GammaCenterOfMassKpiViewModel["status"] = loading
    ? "loading"
    : error
    ? "error"
    : "ready";

  const formatted =
    hasDistance
      ? `${distanceRaw! >= 0 ? "+" : ""}${distanceRaw!.toFixed(1)}%`
      : null;

  const metaParts: string[] = [];

  if (
    typeof value?.kCom === "number" &&
    Number.isFinite(value.kCom) &&
    typeof spot === "number" &&
    Number.isFinite(spot)
  ) {
    metaParts.push(
      `K_COM ${Math.round(value.kCom).toLocaleString()} vs Spot ${Math.round(
        spot
      ).toLocaleString()}`
    );
  }

  if (bucketLabel) {
    // e.g. "Bucket: 7–45D, weighted by e^{-T/30}"
    metaParts.push(bucketLabel);
  }

  const meta = metaParts.length ? metaParts.join(" · ") : undefined;

  const extraBadge =
    hasDistance ? describeSide(value!.side, distanceRaw!) : null;

  return {
    status,
    value: formatted,
    guidanceValue: hasDistance ? distanceRaw! : null,
    meta,
    extraBadge,
    errorMessage: error ?? undefined,
    reload: refresh,
  };
}
