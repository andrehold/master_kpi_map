import KpiCard from "../../KpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { useGammaCenterOfMassKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function GammaCenterOfMassCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale, samples } = context;
  const vm = useGammaCenterOfMassKpi();

  let value: any = vm.value ?? samples[kpi.id];
  let meta: string | undefined = vm.meta;
  let extraBadge: string | null = vm.extraBadge ?? null;
  let footer: any;

  if (vm.status === "loading") {
    value = "…";
    meta = "loading";
    extraBadge = "Computing Γ-COM…";
  } else if (vm.status === "error") {
    value = "—";
    meta = vm.errorMessage ?? "error";
    extraBadge = "Error";
  } else if (!vm.value) {
    value = "—";
    meta = "Awaiting data";
  }

  if (vm.footer) {
    type Row = (typeof vm.footer.rows)[number];
    footer = (
      <KpiMiniTable<Row>
        title={vm.footer.title}
        rows={vm.footer.rows}
        getKey={(r) => r.id}
        columns={[
          { id: "label", header: "Metric", render: (r) => r.label },
          { id: "value", header: "Value", align: "right", render: (r) => r.value },
        ]}
      />
    );
  }

  return (
    <KpiCard
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      footer={footer}
      infoKey={KPI_IDS.gammaCenterOfMass}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
