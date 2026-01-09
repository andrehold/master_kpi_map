import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import type { KpiCardComponentProps } from "../types";

import { useSmaTrendQualityKpi } from "../../../../hooks/kpi/useSmaTrendQualityKpi";

export default function SmaTrendQualityCard({ kpi, context }: KpiCardComponentProps) {
  const currency = (context as any)?.currency ?? "BTC";
  const vm = useSmaTrendQualityKpi(currency);

  const footer =
    vm.rows && vm.rows.length > 0 ? (
      <KpiMiniTable
        title="MA slope + separation"
        rows={vm.rows}
        getKey={(r) => r.id}
        columns={[
          { id: "metric", header: "Metric", render: (r) => r.metric },
          { id: "value", header: "Value", align: "right", render: (r) => r.value },
        ]}
      />
    ) : undefined;

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      value={vm.value ?? (vm.status === "loading" ? "Loading…" : "—")}
      meta={vm.errorMessage ?? vm.meta}
      extraBadge={vm.extraBadge}
      footer={footer}
    />
  );
}
