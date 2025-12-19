import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useHitRateOfExpectedMoveKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function EmHitRateCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale } = context;

  const vm = useHitRateOfExpectedMoveKpi("BTC", { horizonDays: 1, lookbackDays: 30 });

  let value: any = vm.formatted;
  let meta: string | undefined = vm.message ?? "Hit rate of 1D expected move";
  let extraBadge: string | null = null;
  let footer: any;
  let guidanceValue: number | null = null;

  if (vm.status === "loading") {
    value = "…";
    meta = "loading";
    extraBadge = "Awaiting data";
  } else if (vm.status === "error") {
    value = "—";
    meta = vm.errorMessage ?? "error";
    extraBadge = "Error";
  } else {
    if (vm.meta) {
      const { horizonDays, lookbackDays, hits, misses, total } = vm.meta;

      if (typeof hits === "number" && typeof total === "number" && total > 0) {
        guidanceValue = (hits / total) * 100;
        extraBadge = `${hits}/${total} within EM`;
      } else {
        extraBadge = "Awaiting data";
      }

      type Row = { id: string; label: string; value: string };
      const rows: Row[] = [
        { id: "horizon", label: "Horizon", value: `${horizonDays}D` },
        { id: "lookback", label: "Lookback window", value: `${lookbackDays}D` },
        { id: "hits", label: "Within EM", value: String(hits) },
        { id: "misses", label: "Outside EM", value: String(misses) },
        { id: "total", label: "Evaluated intervals", value: String(total) },
      ];

      footer = (
        <KpiMiniTable<Row>
          title="Hit rate stats"
          rows={rows}
          getKey={(r) => r.id}
          columns={[
            { id: "label", header: "Metric", render: (r) => r.label },
            { id: "value", header: "Value", align: "right", render: (r) => r.value },
          ]}
        />
      );
    } else {
      extraBadge = "Awaiting data";
    }
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
      infoKey={KPI_IDS.emHitRate}
      guidanceValue={guidanceValue}
    />
  );
}
