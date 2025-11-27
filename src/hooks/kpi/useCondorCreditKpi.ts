// src/hook/kpi/useCondorCreditKpi.ts
import type { ReactNode } from "react";
import type { useCondorCreditPctOfEM } from "../domain/useCondorCreditPctOfEM";
import {
  fmtStrike,
  fmtDistPct,
  fmtDelta,
  fmtPremiumUsd,
  fmtUsdShort,
} from "../../utils/format"; // adjust path if needed

type CondorState = ReturnType<typeof useCondorCreditPctOfEM>;

export interface CondorLegRow {
  id: string;
  legLabel: string;
  strike: string;
  distPct: string;
  delta: string;
  premium: string;
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
 * Uses CondorCreditPctOfEMPoint from useCondorCreditPctOfEM:
 * - pctOfEm is already in percent units (e.g. 7.53 = 7.53%)
 */
export function useCondorCreditKpi(
  state: CondorState | null | undefined
): CondorCreditKpiViewModel {
  const loading = !!state?.loading;
  const error = state?.error;
  const data = state?.data;

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

    if (
      condorCreditUsd != null &&
      isFinite(condorCreditUsd) &&
      emUsd != null &&
      isFinite(emUsd)
    ) {
      extraBadge = `Condor ${fmtUsdShort(condorCreditUsd)} • EM ${fmtUsdShort(
        emUsd
      )}`;
    }

    guidanceValue = pct;
  }

  // --- 2) Legs mini table (from strikes + indexPrice + legs) ---------------

  if (
    data &&
    data.strikes &&
    data.indexPrice &&
    isFinite(data.indexPrice) &&
    (data as any).legs
  ) {
    const { strikes, indexPrice } = data;
    const legs = (data as any).legs as {
      longPut?: { delta?: number | null; premiumUsd?: number | null };
      shortPut?: { delta?: number | null; premiumUsd?: number | null };
      shortCall?: { delta?: number | null; premiumUsd?: number | null };
      longCall?: { delta?: number | null; premiumUsd?: number | null };
    };

    type LegKey = "longPut" | "shortPut" | "shortCall" | "longCall";

    const config: Array<{
      id: string;
      key: LegKey;
      label: string;
      side: "short" | "long";
      strike: number;
    }> = [
      {
        id: "short-put",
        key: "shortPut",
        label: "Short PUT",
        side: "short",
        strike: strikes.shortPut,
      },
      {
        id: "short-call",
        key: "shortCall",
        label: "Short CALL",
        side: "short",
        strike: strikes.shortCall,
      },
      {
        id: "long-put",
        key: "longPut",
        label: "Long PUT hedge",
        side: "long",
        strike: strikes.longPut,
      },
      {
        id: "long-call",
        key: "longCall",
        label: "Long CALL hedge",
        side: "long",
        strike: strikes.longCall,
      },
    ];

    const rows: CondorLegRow[] = config.map((legCfg) => {
      const distPctNum =
        indexPrice && isFinite(indexPrice)
          ? (legCfg.strike / indexPrice - 1) * 100
          : null;

      const legMeta = (legs as any)[legCfg.key] as
        | { delta?: number | null; premiumUsd?: number | null }
        | undefined;

      const deltaRaw = legMeta?.delta ?? null;
      const premiumRaw = legMeta?.premiumUsd ?? null;

      return {
        id: legCfg.id,
        legLabel: legCfg.label,
        strike: fmtStrike(legCfg.strike),
        distPct: fmtDistPct(distPctNum),
        delta: fmtDelta(deltaRaw),
        premium: fmtPremiumUsd(premiumRaw),
        section: legCfg.side,
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
