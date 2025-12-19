import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import type { KpiCardComponentProps } from "../types";

export default function Skew25dRrCard({ kpi, context }: KpiCardComponentProps) {
  const { locale, samples } = context;
  const entries = context.skew.entries;

  const primary = entries.find((e) => e.key === "30d") ?? entries[0];

  let value: any = samples[kpi.id];
  let meta: string | undefined;
  let extraBadge: string | null = null;

  if (primary) {
    const { label, state } = primary;

    if (state?.skew != null) {
      const vp = state.skew * 100;
      value = `${vp >= 0 ? "+" : ""}${vp.toFixed(2)}`;
      meta = state.expiryLabel ? `${label} · ${state.expiryLabel}` : label;

      if (state.ivC25 != null && state.ivP25 != null) {
        extraBadge = `C25 ${(state.ivC25 * 100).toFixed(1)} • P25 ${(state.ivP25 * 100).toFixed(1)}`;
      } else {
        extraBadge = "Interpolating…";
      }
    } else if (state?.loading) {
      value = "…";
      meta = `${label} · loading`;
    } else if (state?.error) {
      value = "—";
      meta = `${label} · error`;
    } else {
      meta = label;
    }
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  const rows = entries.map(({ key, label, state }) => {
    const id = `${kpi.id}-${key}`;
    const tenorLabel = state?.expiryLabel ? `${label} · ${state.expiryLabel}` : label;

    let c25 = "—";
    let p25 = "—";
    let rr = "—";

    if (state?.loading && !state.skew) {
      c25 = p25 = rr = "…";
    } else if (state?.error) {
      c25 = p25 = rr = "err";
    } else if (state?.skew != null) {
      rr = `${state.skew >= 0 ? "+" : ""}${(state.skew * 100).toFixed(2)}`;
      if (state.ivC25 != null) c25 = `${(state.ivC25 * 100).toFixed(1)}%`;
      if (state.ivP25 != null) p25 = `${(state.ivP25 * 100).toFixed(1)}%`;
    }

    return { id, label: tenorLabel, c25, p25, rr };
  });

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      footer={
        <KpiMiniTable
          title="Tenors"
          rows={rows}
          getKey={(r) => r.id}
          columns={[
            { id: "label", header: "Tenor", render: (r) => r.label },
            { id: "c25", header: "C25", align: "right", render: (r) => r.c25 },
            { id: "p25", header: "P25", align: "right", render: (r) => r.p25 },
            { id: "rr", header: "RR", align: "right", render: (r) => r.rr },
          ]}
        />
      }
    />
  );
}
