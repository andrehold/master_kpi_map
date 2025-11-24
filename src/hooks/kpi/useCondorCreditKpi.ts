// src/hook/kpi/useCondorCreditKpi.ts
import type { ReactNode } from "react";
import type { useCondorCreditPctOfEM } from "../domain/useCondorCreditPctOfEM";
import { fmtK, fmtUsdShort } from "../../utils/format"; // adjust path if needed

// Domain state type from your existing hook
type CondorState = ReturnType<typeof useCondorCreditPctOfEM>;

export interface CondorLegRow {
  id: string;
  legLabel: string;   // "Short PUT", "Long CALL hedge"
  strike: string;     // e.g. "70k"
  distPct: string;    // e.g. "-18.7%"
  delta: string;      // currently "—" (no per-leg delta yet)
  premium: string;    // currently "—" (no per-leg premium yet)
  section: "short" | "long";
}

export interface CondorLegTableSpec {
  title: string;
  rows: CondorLegRow[];
  sections: { index: number; title: string }[];
}

export interface CondorCreditKpiViewModel {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null;

  legsTable?: CondorLegTableSpec;
}

/**
 * View-model builder for the "Condor Credit % of EM" KPI.
 *
 * Uses CondorCreditPctOfEMPoint:
 * - pctOfEm is already in percent units (e.g. 7.53 = 7.53%)
 */
export function useCondorCreditKpi(
  state: CondorState | null | undefined
): CondorCreditKpiViewModel {
  const loading = !!state?.loading;
  const error = state?.error;
  const data = state?.data; // CondorCreditPctOfEMPoint | null

  let value: ReactNode = "—";
  let meta: string | undefined = "Awaiting data";
  let extraBadge: string | null = null;
  let guidanceValue: number | null = null;
  let legsTable: CondorLegTableSpec | undefined;

  // --- 1) Main value / meta / badge / guidance -----------------------------

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
      pctOfEm,
      condorCreditUsd,
      emUsd,
      dte,
      expiryTimestamp,
    } = data;

    // 🔑 pctOfEm is already a percentage (e.g. 7.53), so no extra *100
    const pct =
      typeof pctOfEm === "number" && isFinite(pctOfEm) ? pctOfEm : null;

    value = pct != null ? `${pct.toFixed(2)}%` : "—";

    const parts: string[] = ["Condor credit relative to EM"];

    if (typeof dte === "number" && isFinite(dte)) {
      const dteRounded = Math.round(dte);
      parts.push(`${dteRounded}D structure`);
    }

    if (typeof expiryTimestamp === "number" && isFinite(expiryTimestamp)) {
      const d = new Date(expiryTimestamp);
      parts.push(
        `exp ${d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}`
      );
    }

    meta = parts.join(" · ");

    if (condorCreditUsd != null && isFinite(condorCreditUsd) && emUsd != null && isFinite(emUsd)) {
      extraBadge = `Condor ${fmtUsdShort(condorCreditUsd)} • EM ${fmtUsdShort(
        emUsd
      )}`;
    }

    // Bands / guidance: feed % directly (no extra scaling)
    guidanceValue = pct;
  }

  // --- 2) Legs mini table (from strikes + indexPrice) ----------------------

  if (data && data.strikes && data.indexPrice && isFinite(data.indexPrice)) {
    const { strikes, indexPrice } = data;

    const legsRaw: Array<{
      id: string;
      side: "short" | "long";
      type: "call" | "put";
      strike: number;
    }> = [
      {
        id: "short-put",
        side: "short",
        type: "put",
        strike: strikes.shortPut,
      },
      {
        id: "long-put",
        side: "long",
        type: "put",
        strike: strikes.longPut,
      },
      {
        id: "short-call",
        side: "short",
        type: "call",
        strike: strikes.shortCall,
      },
      {
        id: "long-call",
        side: "long",
        type: "call",
        strike: strikes.longCall,
      },
    ];

    const rows: CondorLegRow[] = legsRaw.map((leg, idx) => {
      const distPctNum =
        indexPrice && isFinite(indexPrice)
          ? (leg.strike / indexPrice - 1) * 100
          : null;

      const legLabel =
        leg.side === "short"
          ? `Short ${leg.type.toUpperCase()}`
          : `Long ${leg.type.toUpperCase()} hedge`;

      const distPct =
        distPctNum != null
          ? `${distPctNum >= 0 ? "+" : ""}${distPctNum.toFixed(1)}%`
          : "—";

      return {
        id: leg.id ?? `leg-${idx}`,
        legLabel,
        strike: fmtK(leg.strike),
        distPct,
        delta: "—",   // no per-leg greeks yet
        premium: "—", // no per-leg premium yet
        section: leg.side,
      };
    });

    const shorts = rows.filter((r) => r.section === "short");
    const longs = rows.filter((r) => r.section === "long");
    const ordered = [...shorts, ...longs];

    const sections: { index: number; title: string }[] =
      shorts.length && longs.length
        ? [
            {
              index: shorts.length,
              title: "Hedges",
            },
          ]
        : [];

    legsTable = {
      title: "Condor legs",
      rows: ordered,
      sections,
    };
  }

  return {
    value,
    meta,
    extraBadge,
    guidanceValue,
    legsTable,
  };
}
