import KpiCard from "../../KpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useGammaWallsKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function GammaWallsCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale } = context;
  const vm = useGammaWallsKpi(context.gammaWalls);

  let footer: any;

  if (vm.status === "error") {
    footer = (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
        Failed to load: {vm.errorMessage ?? "Unknown error"}
      </div>
    );
  } else if (vm.status === "unavailable" || vm.status === "loading" || vm.status === "empty") {
    footer = (
      <div className="text-xs text-[var(--fg-muted)]">
        {vm.message ??
          (vm.status === "unavailable"
            ? "Gamma walls unavailable"
            : vm.status === "loading"
              ? "Loading gamma walls…"
              : "No gamma walls in scope")}
      </div>
    );
  } else {
    type GwRow = NonNullable<typeof vm.rows>[number];
    const rows = vm.rows ?? [];
    footer =
      rows.length > 0 ? (
        <KpiMiniTable<GwRow>
          title="Top γ walls"
          rows={rows}
          getKey={(r) => r.id}
          columns={[
            { id: "strike", header: "Strike", render: (r) => r.strike },
            { id: "size", header: "|GEX| (USD)", align: "right", render: (r) => r.size },
          ]}
        />
      ) : (
        <div className="text-xs text-[var(--fg-muted)]">No gamma walls in scope</div>
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
      infoKey={kpi.id}
      guidanceValue={vm.guidanceValue ?? null}
    />
  );
}
