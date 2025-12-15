import DefaultKpiCard from "./kpiCards/DefaultKpiCard";
import { resolveKpiCard } from "./kpiCards/registry";
import type { KpiCardRendererContext } from "./kpiCards/types";
import type { KPIDef } from "../../data/kpis";

export type { KpiCardRendererContext } from "./kpiCards/types";

type Props = {
  kpi: KPIDef;
  context: KpiCardRendererContext;
};

export default function KpiCardRenderer({ kpi, context }: Props) {
  const Card = resolveKpiCard(kpi.id) ?? DefaultKpiCard;
  return <Card kpi={kpi} context={context} />;
}
