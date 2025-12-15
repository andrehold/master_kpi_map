import KpiCard from "../../KpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useSpotVsSmaKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function SpotVsSmaCard({ kpi, context }: KpiCardComponentProps) {
  const { locale, samples } = context;
  const vm = useSpotVsSmaKpi("BTC");

  let value: any = vm.value ?? samples[kpi.id];
  let meta: string | undefined = vm.meta;
  let extraBadge: string | null = vm.extraBadge ?? null;

  if (vm.status === "loading") {
    value = "…";
    meta = "loading";
    extraBadge = "Fetching SMAs…";
  } else if (vm.status === "error") {
    value = "—";
    meta = vm.errorMessage ?? "error";
    extraBadge = "Error";
  }

  const footer =
    vm.rows && vm.rows.length > 0 ? (
      <KpiMiniTable
        title="Spot vs SMAs"
        rows={vm.rows}
        getKey={(r) => r.id}
        columns={[
          { id: "tenor", header: "Tenor", render: (r) => `${r.tenor}D` },
          { id: "text", header: "Status", align: "right", render: (r) => r.text },
        ]}
      />
    ) : undefined;

  return (
    <KpiCard
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      footer={footer}
      infoKey={kpi.id}
    />
  );
}
