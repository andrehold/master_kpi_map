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
  /** detail line if you still want it in meta */
  meta?: string;
  /** short tag like "Structurally heavy here" / "Heavier upside structure" */
  extraBadge?: string | null;
  /** raw % distance for guidance bands */
  guidanceValue: number | null;
  /** error message if any */
  errorMessage?: string;
  /** reload callback */
  reload: () => void;
  /** mini-table footer rows */
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
  const hasDistance =
    typeof raw === "number" && Number.isFinite(raw);

  const formatted =
    hasDistance ? `${raw! >= 0 ? "+" : ""}${raw!.toFixed(1)}%` : null;

  const guidanceValue = hasDistance ? raw! : null;

  // --- meta (optional, you can keep or simplify) ---
  const metaParts: string[] = [];

  if (
    value &&
    typeof value.kCom === "number" &&
    spot != null &&
    Number.isFinite(spot)
  ) {
    metaParts.push(
      `K_COM ${Math.round(value.kCom).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })} vs Spot ${Math.round(spot).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`,
    );
  }

  if (bucketLabel) {
    metaParts.push(bucketLabel);
  }

  const meta = metaParts.length ? metaParts.join(" · ") : undefined;

  const extraBadge = hasDistance
    ? describeSide(value?.side, raw!)
    : null;

  // --- footer for mini table ---
  let footer: GammaCenterOfMassKpiViewModel["footer"] = undefined;

  if (
    !loading &&
    !error &&
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
      {
        id: "bucket",
        label: "Bucket",
        value: bucketValue,
      },
    ];

    footer = {
      title: "Γ-COM context",
      rows,
    };
  }

  return {
    status,
    value: formatted,
    meta,
    extraBadge,
    guidanceValue,
    errorMessage: error ?? undefined,
    reload: refresh,
    footer,
  };
}
