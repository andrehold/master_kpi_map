import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { KpiMiniTable } from "../../KpiMiniTable";
import { useIVTermStructureKpi } from "../../../../hooks/kpi";
import type { KpiCardComponentProps } from "../types";

export default function TermStructureCard({
  kpi,
  context,
}: KpiCardComponentProps) {
  const { locale, samples } = context;

  const model = useIVTermStructureKpi(context.termStructure ?? null, locale);
  if (!model) {
    return (
      <PersistedKpiCard
        context={context}
        kpi={kpi}
        locale={locale}
        value={samples[kpi.id]}
        meta="Awaiting term structure data"
        persist={null}
      />
    );
  }

  const footerHasRows =
    model.footer &&
    Array.isArray(model.footer.rows) &&
    model.footer.rows.length > 0;

  return (
    <PersistedKpiCard
      context={context}
      kpi={kpi}
      locale={locale}
      value={model.value}
      meta={model.meta}
      extraBadge={model.extraBadge}
      footer={
        footerHasRows ? (
          <KpiMiniTable
            title={model.footer?.title}
            rows={model.footer?.rows ?? []}
            getKey={(r) => r.id}
            columns={[
              { id: "tenor", header: "Tenor", render: (r) => r.tenor },
              { id: "iv", header: "IV", align: "right", render: (r) => r.iv },
              {
                id: "expiry",
                header: "Expiry",
                align: "right",
                render: (r) => r.expiry,
              },
            ]}
          />
        ) : undefined
      }
    />
  );
}
