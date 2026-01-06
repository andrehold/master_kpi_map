import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useRealizedVolKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function RealizedVolCard({ kpi, context }: KpiCardComponentProps) {
  const { locale } = context;
  const vm = useRealizedVolKpi({ currency: "BTC" });

  const footer =
    vm.table && (
      <KpiMiniTable
        title={vm.table.title}
        rows={vm.table.rows}
        getKey={(r) => r.id}
        columns={[
          { id: "window", header: "Window", render: (r) => r.windowLabel },
          { id: "rvClose", header: "RV (close)", align: "right", render: (r) => r.rvClose },
          { id: "rvPark", header: "RV (range)", align: "right", render: (r) => r.rvParkinson },
          { id: "asOf", header: "Updated", align: "right", render: (r) => r.asOf },
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
