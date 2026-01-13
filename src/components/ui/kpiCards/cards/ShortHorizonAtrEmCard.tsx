// src/kpiCards/cards/ShortHorizonAtrEmCard.tsx
import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useShortHorizonAtrEmKpi } from "../../../../hooks/kpi";
import { metricValueAsOfColumns } from "../tablePresets";
import type { KpiCardComponentProps } from "../types";

export default function ShortHorizonAtrEmCard({ kpi, context }: KpiCardComponentProps) {
  const { locale } = context;

  const currency =
    ((context as any)?.currency ?? (context as any)?.samples?.currency ?? "BTC") as "BTC" | "ETH";

  const vm = useShortHorizonAtrEmKpi({
    currency,
    atrDays: 5,
    horizonDays: 5,
    resolutionSec: 86400,
  });

  let value: any = vm.value ?? "—";
  let meta: string | undefined = vm.meta ?? "Short-horizon ATR / EM";
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
      infoKey={KPI_IDS.shortHorizonAtr}
      guidanceValue={guidanceValue}
    />
  );
}
