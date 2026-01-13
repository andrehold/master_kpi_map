import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import type { KpiCardComponentProps } from "../types";

import { useVwapAnchorsKpi } from "../../../../hooks/kpi/useVwapAnchorsKpi";

export default function VwapAnchorsCard({ kpi, context }: KpiCardComponentProps) {
  const { locale } = context;
  const currency = (context as any)?.currency ?? "BTC";

  // ✅ Hook does NOT take context (matches your other KPI hooks)
  const vm = useVwapAnchorsKpi({ currency });

  type Row = (typeof vm.rows)[number];

  const footer =
    vm.rows?.length ? (
      <KpiMiniTable<Row>
        title="VWAP anchors"
        rows={vm.rows}
        getKey={(r) => r.id}
        columns={[
          { id: "metric", header: "Metric", render: (r) => r.metric },
          { id: "value", header: "Value", align: "right", render: (r) => r.formatted },
        ]}
      />
    ) : undefined;

  const value = vm.value ?? (vm.status === "loading" ? "Loading…" : "—");
  const meta = vm.errorMessage ?? vm.meta;

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      footer={footer}
      infoKey={kpi.id}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
