import KpiCard from "../../KpiCard";
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
          {
            id: "rv",
            header: "RV (ann.)",
            align: "right",
            render: (r) => r.rv,
          },
          {
            id: "asOf",
            header: "Updated",
            align: "right",
            render: (r) => r.asOf,
          },
        ]}
      />
    );

  return (
    <KpiCard
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
