import type { ReactNode } from "react";
import { useRealizedVol } from "../domain/useRealizedVol";

export type IvRvRow = {
  id: string;
  windowLabel: string;
  rv: string;
  spread: string;
};

export type IvRvTableSpec = {
  title: string;
  rows: IvRvRow[];
};

export type IvRvSpreadKpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null;
  table?: IvRvTableSpec;
};

export interface UseIvRvSpreadKpiOptions {
  /** DVOL 30D in percent, e.g. 56.4 */
  dvolPct?: number | null;
  currency?: "BTC" | "ETH";
}

/**
 * View-model hook for IV−RV KPI.
 *
 * - Main KPI: DVOL 30D − RV(21D window), labeled as 30D IV−RV.
 * - Mini table: IV 30D vs RV 7D / 30D (21D window) / 60D.
 */
export function useIvRvSpreadKpi(
  opts: UseIvRvSpreadKpiOptions = {}
): IvRvSpreadKpiViewModel {
  const currency = opts.currency ?? "BTC";
  const dvolPct = typeof opts.dvolPct === "number" ? opts.dvolPct : null;

  const rv7 = useRealizedVol({ currency, windowDays: 7 });
  const rv21 = useRealizedVol({ currency, windowDays: 21 });
  const rv60 = useRealizedVol({ currency, windowDays: 60 });

  const rows: IvRvRow[] = [
    buildRow("7d", "7D", rv7, dvolPct),
    buildRow("21d", "30D (21D window)", rv21, dvolPct),
    buildRow("60d", "60D", rv60, dvolPct),
  ];

  let value: ReactNode = "—";
  let meta: string | undefined = "IV − RV (30D / 21D window)";
  let extraBadge: string | null = null;

  const rv21Pct =
    typeof rv21.rv === "number" ? rv21.rv * 100 : null;

  if (rv21.loading && rv21Pct == null) {
    value = "…";
    meta = "loading";
  } else if (rv21.error && rv21Pct == null) {
    value = "—";
    meta = "error";
  } else if (dvolPct != null && rv21Pct != null) {
    const spread = dvolPct - rv21Pct;
    value = formatSignedPct(spread);
    meta = "IV − RV (30D / 21D window)";
    extraBadge = `IV ${dvolPct.toFixed(1)} • RV ${rv21Pct.toFixed(1)}`;
  } else if (dvolPct == null) {
    value = "—";
    meta = "Awaiting IV (DVOL) data";
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  const guidanceValue =
    dvolPct != null && rv21Pct != null ? dvolPct - rv21Pct : null;

  const table: IvRvTableSpec | undefined =
    dvolPct != null
      ? {
          title: `IV 30D (DVOL): ${dvolPct.toFixed(1)}%`,
          rows,
        }
      : undefined;

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
  loading: boolean;
  error?: string;
};

function buildRow(
  id: string,
  windowLabel: string,
  state: RvState,
  dvolPct: number | null
): IvRvRow {
  let rvText = "—";
  let spreadText = "—";

  const rvPct =
    typeof state.rv === "number" ? state.rv * 100 : null;

  if (state.loading && rvPct == null) {
    rvText = "…";
    spreadText = "…";
  } else if (state.error && rvPct == null) {
    rvText = "err";
    spreadText = "err";
  } else if (rvPct != null) {
    rvText = `${rvPct.toFixed(1)}%`;
    if (typeof dvolPct === "number") {
      const diff = dvolPct - rvPct;
      spreadText = formatSignedPct(diff);
    }
  }

  return { id, windowLabel, rv: rvText, spread: spreadText };
}

function formatSignedPct(v?: number | null) {
  if (v == null || !isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}
