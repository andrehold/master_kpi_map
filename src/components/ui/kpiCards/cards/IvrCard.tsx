import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import type { KpiCardComponentProps } from "../types";

export default function IvrCard({ kpi, context }: KpiCardComponentProps) {
  const { locale, samples, ivr, ivp } = context;

  if (ivr == null) {
    return <PersistedKpiCard context={context} kpi={kpi} locale={locale} value={samples[kpi.id]} persist={null} />;
  }

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={`${ivr}`}
      meta="DVOL-based IVR"
      extraBadge={ivp != null ? `IVP ${ivp}` : undefined}
      infoKey={kpi.id}
      guidanceValue={typeof ivr === "number" ? ivr : null}
    />
  );
}
