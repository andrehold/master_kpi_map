import type { ReactNode } from "react";
import { useOpenInterestConcentration } from "../domain/useOpenInterestConcentration";

export type OIRow = {
  id: string;
  label: string;
  value: string;
  kind: "strike" | "total";
};

export type OiTableSpec = {
  title: string;
  rows: OIRow[];
  sections?: { index: number; title: string }[];
};

export type KpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null;
  table?: OiTableSpec; // 👈 no JSX, just data for the footer
};

export interface UseOiConcentrationKpiOptions {
  topN?: number;
  windowPct?: number;
}

export function useOiConcentrationKpi(
  opts: UseOiConcentrationKpiOptions = {}
): KpiViewModel {
  const topN = opts.topN ?? 3;
  const windowPct = opts.windowPct ?? 0.25;

  const { loading, error, metrics } = useOpenInterestConcentration({
    topN,
    windowPct,
  } as any);

  let value: ReactNode = "—";

  if (loading && !metrics) value = "…";
  else if (error) value = "—";
  else if (metrics?.topNShare != null)
    value = `${(metrics.topNShare * 100).toFixed(1)}%`;

  const meta: string = (() => {
    if (loading && !metrics) return "loading";
    if (error) return "error";
    if (!metrics) return "Awaiting data";

    const scope =
      metrics.expiryScope === "front"
        ? `Front expiry${
            metrics.frontExpiryTs
              ? ` · ${new Date(
                  metrics.frontExpiryTs
                ).toLocaleDateString()}`
              : ""
          }`
        : "All expiries";

    const s = metrics.indexPrice ? ` · S ${Math.round(metrics.indexPrice)}` : "";
    return `${scope}${s} · n=${metrics.includedCount}`;
  })();

  const win =
    typeof windowPct === "number" && windowPct > 0
      ? ` • Window ±${Math.round(windowPct * 100)}%`
      : "";
  const extraBadge = `Top ${topN}${win}`;

  let table: OiTableSpec | undefined;

  if (!error) {
    const ranked = metrics?.rankedStrikes ?? [];
    const topStrikes = ranked.slice(0, 5);

    if (topStrikes.length) {
      const strikeRows: OIRow[] = topStrikes.map((b: any) => {
        const share =
          metrics && metrics.totalOi > 0 ? b.oi / metrics.totalOi : 0;
        return {
          id: `strike-${b.strike}`,
          label: `$${Math.round(b.strike)}`,
          value: `${(share * 100).toFixed(1)}%`,
          kind: "strike",
        };
      });

      const totalRows: OIRow[] = [
        {
          id: "total-oi",
          label: "Total OI",
          value:
            metrics?.totalOi != null && isFinite(metrics.totalOi)
              ? formatNumber(metrics.totalOi)
              : "—",
          kind: "total",
        },
        {
          id: "topN-share",
          label: `Top ${topN} share`,
          value:
            metrics?.topNShare != null
              ? `${(metrics.topNShare * 100).toFixed(1)}%`
              : "—",
          kind: "total",
        },
        {
          id: "hhi",
          label: "HHI",
          value:
            metrics?.hhi != null
              ? `${(metrics.hhi * 100).toFixed(1)}%`
              : "—",
          kind: "total",
        },
      ];

      table = {
        title: "Top strikes",
        rows: [...strikeRows, ...totalRows],
        sections: [{ index: strikeRows.length, title: "Totals" }],
      };
    }
  }

  const guidanceValue =
    metrics?.topNShare != null ? metrics.topNShare * 100 : null;

  return {
    value,
    meta,
    extraBadge,
    guidanceValue,
    table,
  };
}

function formatNumber(x?: number) {
  if (x == null || !isFinite(x)) return "—";
  if (Math.abs(x) >= 1_000_000_000) return (x / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2) + "M";
  if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(2) + "k";
  return x.toFixed(2);
}
