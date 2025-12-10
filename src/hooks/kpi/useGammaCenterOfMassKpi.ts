// src/hooks/kpi/useGammaCenterOfMassKpi.ts
import { useGammaCenterOfMass } from "../domain/useGammaCenterOfMass";

type GammaComFooterRow = {
  id: string;
  label: string;
  value: string;
};

export type GammaCenterOfMassKpiViewModel = {
  status: "loading" | "error" | "ready";
  /** formatted main value, e.g. "+4.2%" */
  value: string | null;
  /** detail line, if you still want it (can be omitted if you only use the mini table) */
  meta?: string;
  /** badge like "Heavier upside structure", "Structurally heavy here" */
  extraBadge?: string | null;
  /** raw % distance for guidance / bands */
  guidanceValue: number | null;
  /** error text */
  errorMessage?: string;
  /** manual reload */
  reload: () => void;
  /** mini-table config */
  footer?: {
    title: string;
    rows: GammaComFooterRow[];
  };
};

function describeSide(side: string | undefined, pct: number | null): string | null {
  if (pct == null || !Number.isFinite(pct)) return null;

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

  const status: GammaCenterOfMassKpiViewModel["status"] = loading
    ? "loading"
    : error
    ? "error"
    : "ready";

  const raw = value?.distancePct;
  const hasDistance = typeof raw === "number" && Number.isFinite(raw);

  const mainValue =
    hasDistance ? `${raw! >= 0 ? "+" : ""}${raw!.toFixed(1)}%` : null;

  const guidanceValue = hasDistance ? raw! : null;

  // --- optional meta string (you can keep or drop this) ---
  const metaParts: string[] = [];

  if (
    value &&
    typeof value.kCom === "number" &&
    spot != null &&
    Number.isFinite(spot)
  ) {
    const kComStr = Math.round(value.kCom).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
    const spotStr = Math.round(spot).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });

    metaParts.push(`K_COM ${kComStr} vs Spot ${spotStr}`);
  }

  if (bucketLabel) {
    metaParts.push(bucketLabel);
  }

  const meta = metaParts.length ? metaParts.join(" · ") : undefined;

  const extraBadge = hasDistance
    ? describeSide(value?.side, raw!)
    : null;

  // --- footer for KpiMiniTable ---
  let footer: GammaCenterOfMassKpiViewModel["footer"] = undefined;

  if (
    !loading &&
    !error &&
    value &&
    value.hasData &&
    typeof value.kCom === "number" &&
    spot != null &&
    Number.isFinite(spot)
  ) {
    const kComStr = Math.round(value.kCom).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
    const spotStr = Math.round(spot).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });

    // normalise bucket string so we don't get "Bucket: Bucket: ..."
    let bucketValue: string;
    if (bucketLabel) {
      const trimmed = bucketLabel.trim();
      bucketValue = trimmed.startsWith("Bucket:")
        ? trimmed.replace(/^Bucket:\s*/, "")
        : trimmed;
    } else {
      bucketValue = "7–45D, weighted by e^{-T/30}";
    }

    const rows: GammaComFooterRow[] = [
      {
        id: "kcom",
        label: "Γ-COM vs spot",
        value: `K_COM ${kComStr} vs Spot ${spotStr}`,
      },
    ];

    // add Gamma Gravity row if available
    if (
      value.gravityShare != null &&
      Number.isFinite(value.gravityShare)
    ) {
      const gravityPct = value.gravityShare * 100;
      rows.push({
        id: "gravity",
        label: "Gamma gravity (near spot)",
        value: `${gravityPct.toFixed(0)}% of gamma`,
      });
    }

    rows.push({
      id: "bucket",
      label: "Bucket",
      value: bucketValue,
    });

    footer = {
      title: "Γ-COM context",
      rows,
    };
  }

  return {
    status,
    value: mainValue,
    meta,
    extraBadge,
    guidanceValue,
    errorMessage: error ?? undefined,
    reload: refresh,
    footer,
  };
}
