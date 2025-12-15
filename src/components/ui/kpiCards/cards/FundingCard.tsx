import KpiCard from "../../KpiCard";
import type { KpiCardComponentProps } from "../types";

export default function FundingCard({ kpi, context }: KpiCardComponentProps) {
  const { locale, samples } = context;
  const { loading, error, current8h, avg7d8h, ts } = context.funding;

  let value: any = samples[kpi.id];
  let meta: string | undefined;
  let badge: string | null = null;

  if (loading) {
    value = "…";
    meta = "loading";
  } else if (error) {
    value = "—";
    meta = "error";
  } else if (current8h != null) {
    value = `${(current8h * 100).toFixed(3)}%`;
    meta = ts ? `Deribit 8h · ${new Date(ts).toLocaleTimeString()}` : "Deribit 8h";
    if (avg7d8h != null) badge = `7d avg ${(avg7d8h * 100).toFixed(3)}%`;
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  return (
    <KpiCard kpi={kpi} locale={locale} value={value} meta={meta} extraBadge={badge} />
  );
}
