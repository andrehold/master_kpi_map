// src/hooks/kpi/useIVTermStructureKpi.ts
import { useMemo } from "react";
import { KPI_IDS } from "../../kpi/kpiIds";
import { useIVTermStructure } from "../domain/useIVTermStructure";

type TermStructureRow = {
  id: string;
  tenor: string;
  expiry: string;
  iv: string;
};

export interface IVTermStructureKpiViewModel {
  id: string;
  value: string | null;
  meta?: string;
  extraBadge?: string | null;
  footer?: {
    title: string;
    rows: TermStructureRow[];
  };
  message?: string;
  errorMessage?: string | null;
}

export function useIVTermStructureKpi(): IVTermStructureKpiViewModel | null {
  const { data } = useIVTermStructure();

  return useMemo(() => {
    const ts = data;
    if (!ts || !Array.isArray(ts.points) || ts.points.length === 0) {
      return null;
    }

    // 👇 mini-table uses *all* valid tenors (incl. 1–4 DTE)
    const rowsSource = ts.points
      .filter(
        (p) =>
          typeof p.iv === "number" &&
          Number.isFinite(p.iv as number) &&
          typeof p.dteDays === "number" &&
          p.dteDays > 0
      )
      .sort((a, b) => (a.dteDays ?? 0) - (b.dteDays ?? 0));

    if (rowsSource.length === 0) {
      return null;
    }

    const labelTitle =
      ts.label === "insufficient"
        ? "Insufficient"
        : ts.label.charAt(0).toUpperCase() + ts.label.slice(1);

    const premiumPct =
      ts.termPremium != null ? ts.termPremium * 100 : null;
    const sign =
      premiumPct != null && premiumPct >= 0 ? "+" : "";

    const metaParts: string[] = [];
    if (ts.slopePerYear != null) {
      metaParts.push(`Slope ${(ts.slopePerYear * 100).toFixed(2)}%/yr`);
    }
    if (typeof ts.n === "number") {
      metaParts.push(`n=${ts.n}`);
    }
    if (ts.indexPrice != null) {
      metaParts.push(`S ${Math.round(ts.indexPrice)}`);
    }
    const meta = metaParts.join(" · ");

    const first = rowsSource[0];
    const last = rowsSource[rowsSource.length - 1];
    const extraBadge =
      typeof first.dteDays === "number" && typeof last.dteDays === "number"
        ? `${Math.round(first.dteDays)}d → ${Math.round(last.dteDays)}d`
        : undefined;

    const rows: TermStructureRow[] = rowsSource.map((p, idx) => {
      const dte = Math.max(0, Math.round(p.dteDays as number));
      const tenor = dte < 365 ? `${dte}d` : `${(dte / 365).toFixed(1)}y`;
      const expiry =
        typeof p.expiryISO === "string"
          ? p.expiryISO.slice(0, 10)
          : "";
      const ivPct =
        typeof p.iv === "number" && Number.isFinite(p.iv as number)
          ? `${(p.iv * 100).toFixed(1)}%`
          : "—";

      return {
        id: `${KPI_IDS.termStructure}-${idx}`,
        tenor,
        expiry,
        iv: ivPct,
      };
    });

    return {
      id: KPI_IDS.termStructure,
      value:
        premiumPct != null
          ? `${labelTitle} (${sign}${premiumPct.toFixed(1)}%)`
          : labelTitle,
      meta,
      extraBadge,
      footer: {
        title: "Term structure (ATM IV per tenor)",
        rows,
      },
    };
  }, [data]);
}
