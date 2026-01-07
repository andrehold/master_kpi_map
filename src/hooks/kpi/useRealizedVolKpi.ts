import type { ReactNode } from "react";
import { useRealizedVol } from "../domain/useRealizedVol";

export type RvRow = {
  id: string;
  windowLabel: string;
  rvClose: string;
  rvParkinson: string;
  asOf: string;
};

export type RvTableSpec = {
  title: string;
  rows: RvRow[];
};

export type RealizedVolKpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null;
  table?: RvTableSpec;
};

export interface UseRealizedVolKpiOptions {
  currency?: "BTC" | "ETH";
}

/**
 * View-model hook for RV KPI.
 *
 * - Main KPI: "30D" RV represented by a 21D trailing window.
 * - Mini table: 7D / 30D (21D window) / 60D annualized RV.
 */
export function useRealizedVolKpi(
  opts: UseRealizedVolKpiOptions = {}
): RealizedVolKpiViewModel {
  const currency = opts.currency ?? "BTC";

  // windows: 7 / 21 / 60 days
  const rv7 = useRealizedVol({ currency, windowDays: 7, includeParkinson: true });
  const rv21 = useRealizedVol({ currency, windowDays: 21, includeParkinson: true });
  const rv60 = useRealizedVol({ currency, windowDays: 60, includeParkinson: true });

  const rows: RvRow[] = [
    buildRow("7d", "7D", rv7),
    buildRow("21d", "30D (21D window)", rv21),
    buildRow("60d", "60D", rv60),
  ];

  let value: ReactNode = "—";
  let meta: string | undefined;
  let extraBadge: string | null = null;

  // Main KPI = 21D window, labeled as 30D RV
  if (rv21.loading && rv21.rv == null) {
    value = "…";
    meta = "loading";
  } else if (rv21.error && rv21.rv == null) {
    value = "—";
    meta = "error";
  } else if (typeof rv21.rv === "number") {
    value = formatPct(rv21.rv);
    const park = typeof rv21.rvParkinson === "number" ? ` • Parkinson ${formatPct(rv21.rvParkinson)}` : "";
    meta = rv21.lastUpdated
      ? `30D RV (21D window)${park} · ${new Date(rv21.lastUpdated).toLocaleDateString()}`
      : `30D RV (21D window)${park}`;
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  if (rv21.loading && typeof rv21.rv === "number") {
    extraBadge = "Refreshing…";
  }

  const table: RvTableSpec | undefined =
    rows.length > 0
      ? {
        title: "Realized vol (annualized)",
        rows,
      }
      : undefined;

  const guidanceValue =
    typeof rv21.rv === "number" ? rv21.rv * 100 : null;

  return {
    value,
    meta,
    extraBadge,
    guidanceValue,
    table,
  };
}

type RvState = {
  rv?: number;
  rvParkinson?: number;
  lastUpdated?: number;
  loading: boolean;
  error?: string;
};

function buildRow(id: string, windowLabel: string, state: RvState): RvRow {
  let rvClose = "—";
  let rvParkinson = "—";
  let asOf = "";

  if (state.loading && state.rv == null) {
    rvClose = "…";
    rvParkinson = "…";
    asOf = "loading";
  } else if (state.error && state.rv == null) {
    rvClose = "err";
    rvParkinson = "err";
    asOf = "error";
  } else if (typeof state.rv === "number") {
    rvClose = formatPct(state.rv);
    rvParkinson = typeof state.rvParkinson === "number" ? formatPct(state.rvParkinson) : "—";
    asOf = state.lastUpdated ? new Date(state.lastUpdated).toLocaleDateString() : "";
  }

  return { id, windowLabel, rvClose, rvParkinson, asOf };
}


function formatPct(v?: number) {
  if (v == null || !isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
