import KpiCard from "../../KpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useTimeToFirstBreachKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function TimeToFirstBreachCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale } = context;

  const vm = useTimeToFirstBreachKpi("BTC", { horizonDays: 1, lookbackDays: 30 });

  let value: any = vm.formatted;
  let meta: string | undefined = vm.message ?? "Avg time to first EM breach (1D horizon)";
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
      const { horizonDays, lookbackDays, total, withBreach, withoutBreach, avgBreachTimePct } = vm.meta;

      if (typeof avgBreachTimePct === "number" && Number.isFinite(avgBreachTimePct)) {
        guidanceValue = avgBreachTimePct;
      }

      extraBadge = total > 0 ? `${withBreach}/${total} with breach` : "Awaiting data";

      type Row = { id: string; label: string; value: string };
      const rows: Row[] = [
        { id: "horizon", label: "Horizon", value: `${horizonDays}D` },
        { id: "lookback", label: "Lookback window", value: `${lookbackDays}D` },
        { id: "total", label: "Evaluated intervals", value: String(total) },
        { id: "withBreach", label: "With breach", value: String(withBreach) },
        { id: "withoutBreach", label: "No breach", value: String(withoutBreach) },
        { id: "avgTime", label: "Avg time to breach", value: Number.isFinite(avgBreachTimePct) ? `${avgBreachTimePct.toFixed(0)}%` : "n/a" },
      ];

      footer = (
        <KpiMiniTable<Row>
          title="Breach timing stats"
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
    <KpiCard
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      footer={footer}
      infoKey={KPI_IDS.timeToFirstBreach}
      guidanceValue={guidanceValue}
    />
  );
}
