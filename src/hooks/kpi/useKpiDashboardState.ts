// src/hooks/kpi/useKpiDashboardState.ts

import { KPI_IDS, type KpiId } from "../../kpi/kpiIds";

// Existing KPI-level hooks
import { useIVTermStructureKpi } from "./useIVTermStructureKpi";
import { useVixKpi } from "./useVixKpi";
import { useHitRateOfExpectedMoveKpi } from "./index";

// Domain-level hooks (no dedicated KPI view-models yet)
import { useDeribitDvol } from "../domain/useDeribitDvol";
import { useIvrFromDvol } from "../domain/useIvrFromDvol";
import { useDeribitSkew25D } from "../domain/useDeribitSkew25D";
import { useDeribitFunding } from "../domain/useDeribitFunding";

/**
 * Minimal snapshot shape we expose to other layers (checklists, etc.).
 */
export type SimpleKpiSnapshot = {
  value: number | null;
  formatted: string;
  tone?: "good" | "caution" | "avoid" | "neutral";
};

export type KpiDashboardState = {
  byId: Partial<Record<KpiId, SimpleKpiSnapshot>>;
};

/**
 * Central aggregator for global KPIs used by strategy checklists.
 *
 * NOTE: For now we hard-code BTC/BTC-PERPETUAL in the domain hooks.
 * If you later want per-strategy underlyings, this is the single place
 * to thread `underlying` / `instrument` through.
 */
export function useKpiDashboardState(): KpiDashboardState {
  // --- Existing KPI hooks ---
  const term = useIVTermStructureKpi();
  const vix = useVixKpi();
  const hitRate = useHitRateOfExpectedMoveKpi("BTC", {
    horizonDays: 1,
    lookbackDays: 30,
  });

  // --- Domain hooks (global KPIs we want in the checklist) ---
  const dvol = useDeribitDvol("BTC");               // DVOL in percent (≈ ATM IV 30D)
  const ivr = useIvrFromDvol("BTC");                // { ivr, ivp } in 0–100
  const skew25 = useDeribitSkew25D({ currency: "BTC" });
  const funding = useDeribitFunding("BTC-PERPETUAL");

  const byId: KpiDashboardState["byId"] = {};

  const setSnapshot = (
    id: KpiId,
    { value, formatted, tone }: { value?: number | null; formatted: string; tone?: SimpleKpiSnapshot["tone"] }
  ) => {
    byId[id] = {
      value: value ?? null,
      formatted,
      tone,
    };
  };

  /* -------------------------------------------------------------------------
   * Term structure (already integrated in your checklist)
   * ---------------------------------------------------------------------- */
  if (term) {
    let formatted = "n/a";
    let numeric: number | null = null;

    if (term.value) {
      // value is a string like "Short premium (−3.4%)"
      formatted = term.value;

      // try to extract the first numeric chunk, e.g. "+3.4" or "-3.4"
      const m = term.value.match(/-?\d+(\.\d+)?/);
      if (m) {
        numeric = Number.parseFloat(m[0]);
      }
    } else if (term.message) {
      // fallback if you ever decide to use message/errorMessage
      formatted = term.message;
    }

    setSnapshot(KPI_IDS.termStructure, {
      value: numeric,
      formatted,
      tone: undefined, // no tone field on the VM – you can derive one later if you like
    });
  }

  /* -------------------------------------------------------------------------
   * ATM IV – from DVOL
   *
   * useDeribitDvol:
   *   { valuePct, lastUpdated, loading, error, refresh }
   * valuePct is 0–100 (percent), e.g. 45.8 => 45.8%
   * ---------------------------------------------------------------------- */
  if (!dvol.loading && !dvol.error && dvol.valuePct != null) {
    const v = dvol.valuePct; // 0–100
    setSnapshot(KPI_IDS.atmIv, {
      value: v,
      formatted: `${v.toFixed(1)} %`,
      tone: undefined,
    });
  }

  /* -------------------------------------------------------------------------
   * IV Rank – from DVOL 1y history
   *
   * useIvrFromDvol:
   *   { ivr, ivp, lastUpdated, loading, error, refresh }
   * ivr/ivp are already 0–100 (percent)
   * ---------------------------------------------------------------------- */
  if (!ivr.loading && !ivr.error && ivr.ivr != null) {
    const v = ivr.ivr; // 0–100
    setSnapshot(KPI_IDS.ivr, {
      value: v,
      formatted: `${v.toFixed(0)} %`,
      tone: undefined, // later we can map IVR bands to tones if you like
    });
  }

  /* -------------------------------------------------------------------------
   * 25Δ Risk Reversal – from per-strike IVs
   *
   * useDeribitSkew25D:
   *   state.skew is in *decimals*, e.g. 0.0123 => 1.23 vol points
   * We convert to "vol points" for display.
   * ---------------------------------------------------------------------- */
  if (!skew25.loading && !skew25.error && typeof skew25.skew === "number") {
    const volPts = skew25.skew * 100; // decimal → vol pts
    const sign = volPts >= 0 ? "+" : "";
    setSnapshot(KPI_IDS.skew25dRr, {
      value: volPts,
      formatted: `${sign}${volPts.toFixed(1)} vol`,
      tone: undefined,
    });
  }

  /* -------------------------------------------------------------------------
   * Funding rate (annualised)
   *
   * useDeribitFunding returns:
   *   { current8h, avg7d8h, zScore, updatedAt, loading, error, refresh }
   *
   * current8h is a decimal per 8h period, e.g. 0.0005 ≈ 0.05% per 8h.
   * Rough annualisation: 3 periods/day * 365 days/year.
   * ---------------------------------------------------------------------- */
  if (!funding.loading && !funding.error && typeof funding.current8h === "number") {
    const per8h = funding.current8h;          // decimal per 8h
    const annualDecimal = per8h * 3 * 365;    // ≈ annualised decimal
    const annualPct = annualDecimal * 100;    // → percent per year

    setSnapshot(KPI_IDS.funding, {
      value: annualPct,
      formatted: `${annualPct.toFixed(2)} %`,
      tone: undefined,
    });
  }

  /* -------------------------------------------------------------------------
   * VIX – existing integration
   *
   * useVixKpi looks like:
   *   { status, value, meta, extraBadge, guidanceValue, errorMessage, ... }
   * and value is a formatted string, e.g. "17.2"
   * ---------------------------------------------------------------------- */
  if (vix && vix.status !== "loading" && vix.status !== "error") {
    if (typeof vix.value === "string" && vix.value.trim().length > 0) {
      const numeric = Number.parseFloat(vix.value.replace(",", "."));
      setSnapshot(KPI_IDS.vix, {
        value: Number.isFinite(numeric) ? numeric : null,
        formatted: vix.value,
        tone: undefined, // later: map from guidanceValue / bands
      });
    }
  }

  console.log("KPI dashboard byId", byId);

  return { byId };
}
