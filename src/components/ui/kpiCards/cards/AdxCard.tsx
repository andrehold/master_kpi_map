// kpiCards/cards/AdxCard.tsx
import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useAdxKpi } from "../../../../hooks/kpi";
import { metricValueAsOfColumns } from "../tablePresets";
import type { KpiCardComponentProps } from "../types";

export default function AdxCard({ kpi, context }: KpiCardComponentProps) {
  const { locale } = context;

  const vm = useAdxKpi({ currency: "BTC" });

  let value: any = vm.value ?? "—";
  let meta: string | undefined = vm.meta ?? "ADX(14) trend strength";
  let extraBadge: string | null = vm.extraBadge ?? null;
  let guidanceValue: number | null = vm.guidanceValue ?? null;

  let footer: any;
  if (vm.table?.rows?.length) {
    type Row = (typeof vm.table.rows)[number];
    footer = (
      <KpiMiniTable<Row>
        title={vm.table.title}
        rows={vm.table.rows}
        getKey={(r) => (r as any).id}
        columns={metricValueAsOfColumns<Row>()}
      />
    );
  }

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      footer={footer}
      infoKey={KPI_IDS.adx}
      guidanceValue={guidanceValue}
    />
  );
}
