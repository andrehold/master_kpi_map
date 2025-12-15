import KpiCard from "../../KpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useLiquidityStressKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function LiquidityStressCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale } = context;

  const vm = useLiquidityStressKpi({
    currency: "BTC",
    windowPct: 0.005,
    clipSize: 10,
    pollMs: 0,
  });

  let footer: any;

  if (vm.table) {
    type Row = (typeof vm.table.rows)[number];
    footer = (
      <KpiMiniTable<Row>
        title={vm.table.title}
        rows={vm.table.rows}
        getKey={(r) => r.id}
        sections={vm.table.sections}
        columns={[
          { id: "label", header: "Market", render: (r) => r.label },
          { id: "spread", header: "Spread", align: "right", render: (r) => r.spread },
          { id: "depth", header: "Depth", align: "right", render: (r) => r.depth },
          { id: "stress", header: "Stress", align: "right", render: (r) => r.stress },
        ]}
      />
    );
  } else if (vm.footerMessage) {
    footer = <div className="text-xs text-[var(--fg-muted)]">{vm.footerMessage}</div>;
  }

  return (
    <KpiCard
      kpi={kpi}
      locale={locale}
      value={vm.value}
      meta={vm.meta}
      extraBadge={vm.extraBadge ?? null}
      footer={footer}
      infoKey={kpi.id}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
