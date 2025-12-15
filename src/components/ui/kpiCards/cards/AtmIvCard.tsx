import KpiCard from "../../KpiCard";
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
      <KpiCard
        kpi={kpi}
        locale={locale}
        value={samples[kpi.id]}
        meta="Awaiting ATM IV data"
      />
    );
  }

  // IMPORTANT: pin the real row type from the actual rows array
  type Row = (typeof vm.footer.rows)[number];

  return (
    <KpiCard
      kpi={kpi}
      locale={locale}
      value={vm.value ?? undefined}
      meta={vm.meta}
      footer={
        vm.footer ? (
          <KpiMiniTable<Row>
            title={vm.footer.title}
            rows={vm.footer.rows}
            getKey={(r) => r.id} // now valid because Row includes id
            columns={tenorIvExpiryColumns<Row>()} // columns typed as Column<Row>[]
          />
        ) : undefined
      }
    />
  );
}
