import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useVixKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function VixCard({ kpi, context }: KpiCardComponentProps) {
  const { locale, samples } = context;
  const vm = useVixKpi();

  let value: any = samples[kpi.id];
  let meta: string | undefined = vm.meta;
  let extraBadge: string | null = vm.extraBadge ?? null;

  if (vm.status === "loading") {
    value = "…";
    meta = "loading";
  } else if (vm.status === "error") {
    value = "—";
    meta = vm.errorMessage ?? "error";
  } else if (vm.value != null) {
    value = vm.value;
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      infoKey={KPI_IDS.vix}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
