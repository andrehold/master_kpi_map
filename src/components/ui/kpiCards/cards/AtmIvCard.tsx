import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useAtmIvKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";
import { tenorIvExpiryColumns } from "../tablePresets";

export default function AtmIvCard({ kpi, context }: KpiCardComponentProps) {
  const { locale, samples } = context;

  const vm = useAtmIvKpi(
    context.termStructure ?? null,
    context.dvolPct ?? null,
    locale,
  );

  if (!vm) {
    return (
      <PersistedKpiCard
        context={context}
        kpi={kpi}
        locale={locale}
        value={samples[kpi.id]}
        meta="Awaiting ATM IV data"
      />
    );
  }

  let footerNode: React.ReactNode | undefined;
  if (vm.footer) {
    type Row = (typeof vm.footer.rows)[number];
    footerNode = (
      <KpiMiniTable<Row>
        title={vm.footer.title}
        rows={vm.footer.rows}
        getKey={(r) => r.id}
        columns={tenorIvExpiryColumns<Row>()}
      />
    );
  }

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={vm.value ?? undefined}
      meta={vm.meta}
      footer={footerNode}
    />
  );
}
