// src/hooks/kpi/useCondorCreditKpi.ts
import type { ReactNode } from "react";
import type { useCondorCreditPctOfEM } from "../domain/useCondorCreditPctOfEM";

// Reuse the actual hook's state shape for type safety
type CondorState = ReturnType<typeof useCondorCreditPctOfEM>;

export interface CondorCreditKpiViewModel {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null;
}

/**
 * Pure view-model builder for the "Condor Credit % of EM" KPI.
 *
 * Takes the existing condor state and produces card-ready props:
 * - value (e.g. "18.25%")
 * - meta ("Condor credit relative to EM")
 * - extraBadge ("Condor $12.34 • EM $45.67")
 * - guidanceValue (for bands, in percent units)
 */
export function useCondorCreditKpi(
  state: CondorState | null | undefined
): CondorCreditKpiViewModel {
  const loading = !!state?.loading;
  const error = state?.error;
  const data = state?.data as
    | {
        valuePct?: number | null;
        condorPriceUsd?: number | null;
        emPct?: number | null;
        emUsd?: number | null;
        tenorDays?: number | null;
        expiryTs?: number | null;
      }
    | undefined;

  let value: ReactNode = "—";
  let meta: string | undefined = "Awaiting data";
  let extraBadge: string | null = null;
  let guidanceValue: number | null = null;

  if (!state) {
    value = "—";
    meta = "Condor credit unavailable";
  } else if (loading && !data) {
    value = "…";
    meta = "loading";
  } else if (error) {
    value = "—";
    meta = "error";
  } else if (data) {
    const {
      valuePct,
      condorPriceUsd,
      emPct,
      emUsd,
      tenorDays,
      expiryTs,
    } = data;

    const pct = typeof valuePct === "number" ? valuePct * 100 : null;

    // Main display value: "% of EM"
    value = pct != null ? `${pct.toFixed(2)}%` : "—";

    // Meta line
    const parts: string[] = ["Condor credit relative to EM"];
    if (tenorDays != null) {
      parts.push(`${tenorDays}D structure`);
    }
    if (expiryTs != null) {
      const d = new Date(expiryTs);
      parts.push(
        `exp ${d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}`
      );
    }
    meta = parts.join(" · ");

    // Extra badge: Condor and EM notionals
    if (condorPriceUsd != null && emUsd != null) {
      extraBadge = `Condor $${condorPriceUsd.toFixed(
        2
      )} • EM $${emUsd.toFixed(2)}`;
    } else if (condorPriceUsd != null && emPct != null) {
      extraBadge = `Condor $${condorPriceUsd.toFixed(
        2
      )} • EM ${((emPct ?? 0) * 100).toFixed(2)}%`;
    }

    // Bands / guidance in percent units
    guidanceValue = pct;
  }

  return {
    value,
    meta,
    extraBadge,
    guidanceValue,
  };
}
