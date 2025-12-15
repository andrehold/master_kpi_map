import KpiCard from "../../KpiCard";
import type { KpiCardComponentProps } from "../types";

export default function RvEmFactorCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale, samples } = context;
  const { ratio, loading, error, rvAnn, ivAnn, tenorDays } = context.rvem;

  const value = loading
    ? "…"
    : ratio != null
      ? `${ratio.toFixed(2)}×`
      : samples[kpi.id] ?? "—";

  const meta = loading
    ? "loading"
    : error
      ? "error"
      : `BTC ${tenorDays}D · RV ÷ IV`;

  const extraBadge =
    rvAnn != null && ivAnn != null
      ? `IV ${(ivAnn * 100).toFixed(1)} • RV ${(rvAnn * 100).toFixed(1)}`
      : null;

  return (
    <KpiCard
      kpi={kpi}
      locale={locale}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
    />
  );
}
