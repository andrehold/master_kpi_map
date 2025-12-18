import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useAtmIvKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";
import { tenorIvExpiryColumns } from "../tablePresets";
import { toSnapshotPayload } from "../persistence/toSnapshotPayload";

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
        persist={null} // don't write to DB until we have real data
      />
    );
  }

  // IMPORTANT: pin the real row type from the actual rows array
  type Row = (typeof vm.footer.rows)[number];

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={vm.value ?? undefined}
      meta={vm.meta}
      persist={toSnapshotPayload(kpi.id, vm.persistVm)}
      footer={
        vm.footer ? (
          <KpiMiniTable<Row>
            title={vm.footer.title}
            rows={vm.footer.rows}
            getKey={(r) => r.id}
            columns={tenorIvExpiryColumns<Row>()}
          />
        ) : undefined
      }
    />
  );
}
