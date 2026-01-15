// src/kpiCards/cards/FundingCard.tsx
import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { metricValueAsOfColumns } from "../tablePresets";
import type { KpiCardComponentProps } from "../types";
import { useFundingKpi } from "../../../../hooks/kpi/useFundingKpi";

export default function FundingCard({ kpi, context }: KpiCardComponentProps) {
  const vm = useFundingKpi({ locale: context.locale });

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
      locale={context.locale}
      value={vm.value ?? "—"}
      meta={vm.meta}
      extraBadge={vm.extraBadge ?? null}
      footer={footer}
      infoKey={KPI_IDS.funding}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
