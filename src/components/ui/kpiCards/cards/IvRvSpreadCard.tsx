import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useIvRvSpreadKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function IvRvSpreadCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale, dvolPct } = context;

  const vm = useIvRvSpreadKpi({
    dvolPct: dvolPct ?? null,
    currency: "BTC",
  });

  const footer =
    vm.table && (
      <KpiMiniTable
        title={vm.table.title}
        rows={vm.table.rows}
        getKey={(r) => r.id}
        columns={[
          { id: "window", header: "RV window", render: (r) => r.windowLabel },
          { id: "rv", header: "RV (ann.)", align: "right", render: (r) => r.rv },
          {
            id: "spread",
            header: "IV − RV",
            align: "right",
            render: (r) => r.spread,
          },
        ]}
      />
    );

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={vm.value}
      meta={vm.meta}
      extraBadge={vm.extraBadge}
      footer={footer}
      infoKey={kpi.id}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
