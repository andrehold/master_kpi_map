// src/hooks/kpi/useKpiDashboardState.ts

import { KPI_IDS, type KpiId } from "../../kpi/kpiIds";
import { useIVTermStructureKpi } from "./useIVTermStructureKpi";
import { useVixKpi } from "./useVixKpi";

/**
 * Minimal snapshot shape we expose to other layers (checklists, etc.).
 */
export type SimpleKpiSnapshot = {
  value: number | null;
  formatted: string;
  tone?: "good" | "caution" | "avoid" | "neutral";
};

export type KpiDashboardState = {
  // Sparse map: not every KpiId has to be present
  byId: Partial<Record<KpiId, SimpleKpiSnapshot>>;
};

/**
 * Central aggregator hook for KPI view-models.
 *
 * Right now we wire:
 *   - IV Term Structure
 *   - VIX
 *
 * You can extend this step-by-step with more KPIs.
 */
export function useKpiDashboardState(): KpiDashboardState {
  // Term structure (IV term structure KPI)
  const term = useIVTermStructureKpi();

  // VIX (FRED-based)
  const vix = useVixKpi();

  const byId: KpiDashboardState["byId"] = {};

  // --- IV Term Structure ---
  // KpiCardRenderer uses `model.value` as a formatted string already,
  // so we treat it as `formatted` and leave numeric `value` as null for now.
  if (term) {
    // be generous: whatever model.value is, turn it into a string
    const formatted =
      term.value != null
        ? (typeof term.value === "string"
            ? term.value
            : String(term.value))
        : "n/a";

    byId[KPI_IDS.termStructure] = {
      value: null,        // you can later plug in a real numeric if needed
      formatted,
      tone: undefined,    // later: derive from bands if you want signals
    };
  }

  // --- VIX ---
  // From KpiCardRenderer we know `vix` exposes:
  //   status: "loading" | "error" | ...
  //   value: formatted string like "18.3"
  //   meta, extraBadge, guidanceValue, errorMessage
  if (vix && vix.status !== "loading" && vix.status !== "error") {
    if (typeof vix.value === "string" && vix.value.trim().length > 0) {
      const numeric = Number.parseFloat(vix.value.replace(",", "."));

      byId[KPI_IDS.vix] = {
        value: Number.isFinite(numeric) ? numeric : null,
        formatted: vix.value,
        tone: undefined, // later: map from vix.guidanceValue or band lookup
      };
    }
  }
  console.log("KPI dashboard byId", byId);

  return { byId };
}
