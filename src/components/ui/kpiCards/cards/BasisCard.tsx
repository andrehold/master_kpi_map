import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import type { KpiCardComponentProps } from "../types";

export default function BasisCard({ kpi, context }: KpiCardComponentProps) {
  const { locale, samples } = context;
  const { loading, error, pct, abs, ts } = context.basis;

  let value: any = samples[kpi.id];
  let meta: string | undefined;
  let badge: string | null = null;

  if (loading) {
    value = "…";
    meta = "loading";
  } else if (error) {
    value = "—";
    meta = "error";
  } else if (pct != null) {
    const pctValue = pct * 100;
    value = `${pctValue >= 0 ? "+" : ""}${pctValue.toFixed(2)}%`;
    meta = ts ? `BTC spot vs perp · ${new Date(ts).toLocaleTimeString()}` : "BTC spot vs perp";
    if (abs != null && Number.isFinite(abs)) {
      badge = `Δ ${abs >= 0 ? `+$${abs.toFixed(2)}` : `-$${Math.abs(abs).toFixed(2)}`}`;
    }
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      extraBadge={badge}
    />
  );
}
