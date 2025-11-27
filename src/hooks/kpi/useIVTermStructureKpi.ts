import { useMemo } from "react";
import { KPI_IDS } from "../../kpi/kpiIds";
import { useIVTermStructure } from "../domain/useIVTermStructure";

export interface IVTermStructureKpiViewModel {
  id: string;
  value: string | null;
  meta?: string;
  extraBadge?: string | null;
  footer?: {
    title: string;
    rows: {
      id: string;
      tenor: string;
      expiry: string;
    }[];
  };
  errorMessage?: string | null;
}

export function useIVTermStructureKpi(): IVTermStructureKpiViewModel | null {
  const ts = useIVTermStructure();

  return useMemo(() => {
    if (!ts || !ts.points?.length) {
      return null;
    }

    const labelTitle =
      ts.label === "insufficient"
        ? "Insufficient"
        : ts.label[0].toUpperCase() + ts.label.slice(1);

    const premiumPct = ts.termPremium != null ? ts.termPremium * 100 : null;
    const sign = premiumPct != null && premiumPct >= 0 ? "+" : "";

    const meta =
      ts.slopePerYear != null
        ? `Slope ${(ts.slopePerYear * 100).toFixed(2)}%/yr · n=${ts.n}`
        : `n=${ts.n}`;

    const extraBadge =
      ts.points.length >= 2
        ? `${ts.points[0]?.expiryISO} → ${ts.points[ts.points.length - 1]?.expiryISO}`
        : "Awaiting data";

    const points = ts.points.slice(0, ts.n ?? ts.points.length);
    const rows = points.map((p, idx) => {
      const expiryDate = new Date(p.expiryISO);
      const expiryMs = expiryDate.getTime();
      const dte = Math.max(0, Math.round((expiryMs - ts.asOf) / 86400000));

      const tenor = dte < 365 ? `${dte}d` : `${(dte / 365).toFixed(1)}y`;
      const expiry = expiryDate.toISOString().slice(0, 10);

      return {
        id: `${KPI_IDS.termStructure}-${idx}`,
        tenor,
        expiry,
      };
    });

    return {
      id: KPI_IDS.termStructure,
      value:
        labelTitle +
        (premiumPct != null ? ` (${sign}${premiumPct.toFixed(1)}%)` : ""),
      meta,
      extraBadge,
      footer: {
        title: "Expiries in curve",
        rows,
      },
    };
  }, [ts]);
}
