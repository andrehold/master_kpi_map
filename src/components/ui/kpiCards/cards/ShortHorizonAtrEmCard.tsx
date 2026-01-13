// src/kpiCards/cards/ShortHorizonAtrEmCard.tsx
import type { KpiCardComponentProps } from "../types";
import { KPI_IDS } from "../../../../kpi/kpiIds";
import { PersistedKpiCard } from "../persistence/PersistedKpiCard";
import { useShortHorizonAtrEmKpi } from "../../../../hooks/kpi/useShortHorizonAtrEmKpi";

export default function ShortHorizonAtrEmCard({ kpi, context }: KpiCardComponentProps) {
    // Try to respect whatever you already store on context; default BTC if absent
    const currency =
        ((context as any)?.currency ??
            (context as any)?.samples?.currency ??
            "BTC") as "BTC" | "ETH";

    const vm = useShortHorizonAtrEmKpi({ currency, atrDays: 5, horizonDays: 5, resolutionSec: 86400 });

    // If your PersistedKpiCard prop types are strict and differ, casting avoids TS noise.
    const Persisted = PersistedKpiCard as any;

    return (
        <Persisted
            kpi={kpi}
            context={context}
            infoKey={KPI_IDS.shortHorizonAtr}
            value={"WIRED ✅"}
            meta={"ShortHorizonAtrEmCard is rendering"}
            extraBadge={vm.extraBadge}
            guidanceValue={vm.guidanceValue ?? undefined}
            footerRows={vm.table?.rows ?? []}
            footerTitle={vm.table?.title}
        />
    );
}