import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { metricValueAsOfColumns } from "../tablePresets";
import type { KpiCardComponentProps } from "../types";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useFundingKpi } from "../../../../hooks/kpi/useFundingKpi"; // adjust if your path differs

export default function FundingCard({ kpi, context }: KpiCardComponentProps) {
  const { locale } = context;

  const vm = useFundingKpi({ locale });

  let footer: any;
  if (vm.table?.rows?.length) {
    type Row = (typeof vm.table.rows)[number];
    footer = (
      <KpiMiniTable<Row>
        title={vm.table.title}
        rows={vm.table.rows}
        getKey={(r) => r.id}
        columns={metricValueAsOfColumns<Row>()}
      />
    );
  }

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={vm.value ?? "—"}
      meta={vm.meta}
      extraBadge={vm.extraBadge ?? null}
      footer={footer}
      infoKey={KPI_IDS.funding}                 // ✅ enables guidance rendering
      guidanceValue={vm.guidanceValue ?? null}  // ✅ drives the band bar
    />
  );
}
