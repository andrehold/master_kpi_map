import KpiCard from "../KpiCard";
import type { KpiCardComponentProps } from "./types";

export default function DefaultKpiCard({ kpi, context }: KpiCardComponentProps) {
  return (
    <KpiCard
      kpi={kpi}
      locale={context.locale}
      value={context.samples[kpi.id]}
    />
  );
}
