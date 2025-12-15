import KpiCard from "../../KpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useOiConcentrationKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function OiConcentrationCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale } = context;
  const vm = useOiConcentrationKpi({ topN: 3, windowPct: 0.25 });

  const footer =
    vm.table && (
      <KpiMiniTable
        title={vm.table.title}
        rows={vm.table.rows}
        getKey={(r) => r.id}
        sections={vm.table.sections}
        columns={[
          { id: "label", header: "Strike / metric", render: (r) => r.label },
          { id: "value", header: "% of OI / value", align: "right", render: (r) => r.value },
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
      guidanceValue={vm.guidanceValue}
    />
  );
}
