import KpiCard from "../../KpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useEmRibbonKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function EmRibbonCard({ kpi, context }: KpiCardComponentProps) {
  const { locale } = context;
  const vm = useEmRibbonKpi(context.expectedMove, locale);

  let footer: any;

  if (vm.table) {
    type EmTableRow = (typeof vm.table.rows)[number];
    footer = (
      <KpiMiniTable<EmTableRow>
        title={vm.table.title}
        rows={vm.table.rows}
        getKey={(r) => r.id}
        emptyLabel={vm.table.emptyLabel}
        columns={[
          { id: "tenor", header: "Tenor", render: (r) => r.tenor },
          { id: "expiry", header: "Expiry", align: "right", render: (r) => r.expiry },
          { id: "abs", header: "±$ Move", align: "right", render: (r) => r.abs },
          { id: "pct", header: "±%", align: "right", render: (r) => r.pct },
        ]}
      />
    );
  }

  return (
    <KpiCard
      kpi={kpi}
      locale={locale}
      value={vm.value}
      meta={vm.meta}
      extraBadge={vm.extraBadge ?? null}
      footer={footer}
    />
  );
}
