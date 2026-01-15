import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import type { KpiCardComponentProps } from "../types";
import { useFundingKpi } from "../../../../hooks/kpi/useFundingKpi";

export default function FundingCard({ kpi, context }: KpiCardComponentProps) {
  const vm = useFundingKpi({ locale: context.locale });

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={context.locale}
      value={vm.value}
      meta={vm.meta}
      extraBadge={vm.extraBadge}
    />
  );
}
