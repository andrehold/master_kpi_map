import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useCondorCreditKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function CondorCreditCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale } = context;
  const vm = useCondorCreditKpi(context.condor);

  let footer: any;

  if (vm.legsTable) {
    type Row = (typeof vm.legsTable.rows)[number];
    footer = (
      <KpiMiniTable<Row>
        title={vm.legsTable.title}
        rows={vm.legsTable.rows}
        getKey={(r) => r.id}
        sections={vm.legsTable.sections}
        columns={[
          { id: "legLabel", header: "Leg", render: (r) => r.legLabel },
          { id: "strike", header: "Strike", align: "right", render: (r) => r.strike },
          { id: "distPct", header: "Dist", align: "right", render: (r) => r.distPct },
          { id: "delta", header: "Δ", align: "right", render: (r) => r.delta },
          { id: "premium", header: "Premium", align: "right", render: (r) => r.premium },
        ]}
      />
    );
  }

  const persist = vm.value == null || vm.value === "…" || vm.value === "—" ? null : undefined;

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={vm.value}
      meta={vm.meta}
      extraBadge={vm.extraBadge ?? null}
      infoKey={KPI_IDS.condorCreditEm}
      guidanceValue={vm.guidanceValue ?? null}
      footer={footer}
      persist={persist}
    />
  );
}
