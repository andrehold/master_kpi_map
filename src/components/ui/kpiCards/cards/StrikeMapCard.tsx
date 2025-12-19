import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import type { StrikeMapTableRow } from "../../../../kpi/strikeMapTypes";
import { useStrikeMapKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function StrikeMapCard({ kpi, context }: KpiCardComponentProps) {
  const { locale } = context;

  const vm = useStrikeMapKpi(context.gammaWalls, context.oiConcentration, locale);

  let footer: any;

  if (vm.status === "error") {
    footer = (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
        Failed to build strike map: {vm.errorMessage ?? "Unknown error"}
      </div>
    );
  } else if (vm.status === "unavailable" || vm.status === "loading" || vm.status === "empty") {
    footer = (
      <div className="text-xs text-[var(--fg-muted)]">
        {vm.message ??
          (vm.status === "unavailable"
            ? "Strike map unavailable"
            : vm.status === "loading"
              ? "Loading support/resistance…"
              : "No significant levels in scope")}
      </div>
    );
  } else {
    const rows = vm.table?.rows ?? [];
    footer =
      rows.length > 0 ? (
        <KpiMiniTable<StrikeMapTableRow>
          title={vm.table?.title ?? "Key S/R levels"}
          rows={rows}
          getKey={(r) => `${r.section}-${r.label}-${r.strike}`}
          columns={[
            { id: "section", header: "Side", render: (r) => (r.section === "support" ? "Support" : "Resistance") },
            { id: "label", header: "Level", render: (r) => r.label },
            {
              id: "strike",
              header: "Strike",
              align: "right",
              render: (r) =>
                typeof r.strike === "number" && Number.isFinite(r.strike)
                  ? r.strike.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : "—",
            },
            {
              id: "score",
              header: "Score",
              align: "right",
              render: (r) =>
                typeof r.score === "number" && Number.isFinite(r.score)
                  ? `${Math.round(r.score * 100)}%`
                  : "—",
            },
          ]}
        />
      ) : (
        <div className="text-xs text-[var(--fg-muted)]">No significant levels in scope</div>
      );
  }

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={vm.value}
      meta={vm.meta}
      extraBadge={vm.extraBadge ?? null}
      footer={footer}
      infoKey={kpi.id}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
