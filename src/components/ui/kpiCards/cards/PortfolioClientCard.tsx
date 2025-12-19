import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { getClientPortfolioModel, type ClientPortfolioRow } from "../../../../kpi/clientPortfolios";
import type { KpiCardComponentProps } from "../types";

export default function PortfolioClientCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale, samples } = context;

  const model = getClientPortfolioModel(kpi.id);

  if (!model) {
    return (
      <PersistedKpiCard
        context={context}
        kpi={kpi}
        locale={locale}
        value={samples[kpi.id] ?? "—"}
        meta="No client config found"
        persist={null}
      />
    );
  }

  const footer = (
    <KpiMiniTable<ClientPortfolioRow>
      title="PnL & Greeks vs limits"
      rows={model.rows}
      getKey={(r) => r.id}
      columns={[
        { id: "metric", header: "Metric", render: (r) => r.metric },
        {
          id: "value",
          header: "Value",
          align: "right",
          render: (r) => <span className="tabular-nums">{r.actual}</span>,
        },
        {
          id: "threshold",
          header: "Threshold",
          align: "right",
          render: (r) => (
            <span className="inline-flex items-center gap-1 tabular-nums">
              {r.threshold}
              <span
                className={[
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border",
                  r.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/40 bg-red-500/10 text-red-400",
                ].join(" ")}
                aria-label={r.ok ? "Within limit" : "Limit breached"}
              >
                {r.ok ? "OK" : "Breach"}
              </span>
            </span>
          ),
        },
      ]}
    />
  );

  const meta = model.baseCurrency
    ? `Base: ${model.baseCurrency}${model.notes ? ` • ${model.notes}` : ""}`
    : model.notes;

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={`${model.pnlPct.toFixed(2)}%`}
      meta={meta}
      extraBadge={model.health}
      footer={footer}
    />
  );
}
