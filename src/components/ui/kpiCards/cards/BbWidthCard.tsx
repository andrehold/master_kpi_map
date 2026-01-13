import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useBbWidthKpi } from "../../../../hooks/kpi";
import { metricValueAsOfColumns } from "../tablePresets";
import type { KpiCardComponentProps } from "../types";

export default function BbWidthCard({ kpi, context }: KpiCardComponentProps) {
  const { locale } = context;

  const vm = useBbWidthKpi({ currency: "BTC" });

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
      value={vm.value ?? "—"}
      meta={vm.meta}
      extraBadge={vm.extraBadge ?? null}
      footer={footer}
      infoKey={KPI_IDS.bbWidth20x2}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
