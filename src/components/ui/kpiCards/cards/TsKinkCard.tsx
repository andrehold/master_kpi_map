import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import type { KpiCardComponentProps } from "../types";

export default function TsKinkCard({ kpi, context }: KpiCardComponentProps) {
  const { locale, samples } = context;
  const { loading, error, data } = context.skew.kink;

  let value: any = samples[kpi.id];
  let meta: string | undefined;
  let badge: string | null = null;

  if (loading) {
    value = "…";
    meta = "loading";
  } else if (error) {
    value = "—";
    meta = "error";
  } else if (data && typeof data.kinkPoints === "number") {
    const vp = data.kinkPoints * 100;
    value = `${vp >= 0 ? "+" : ""}${vp.toFixed(2)}%`;
    meta = `0DTE − mean(1–3DTE)${data.indexPrice ? ` · S ${Math.round(data.indexPrice)}` : ""}`;

    const iv0 = data.iv0dte != null ? (data.iv0dte * 100).toFixed(1) : "—";
    const m13 = data.mean1to3 != null ? (data.mean1to3 * 100).toFixed(1) : "—";
    const ratio = data.kinkRatio != null ? `${data.kinkRatio.toFixed(2)}×` : null;

    badge = ratio ? `0D ${iv0} • 1–3D ${m13} • ${ratio}` : `0D ${iv0} • 1–3D ${m13}`;
  } else {
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
