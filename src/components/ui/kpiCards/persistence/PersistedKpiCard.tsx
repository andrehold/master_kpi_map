import type { ComponentProps } from "react";
import KpiCard from "../../KpiCard";
import { usePersistKpiSnapshot } from "./usePersistKpiSnapshot";
import type { KpiCardRendererContext, KpiSnapshotPayload } from "../types";

type CardProps = ComponentProps<typeof KpiCard>;

export function PersistedKpiCard(
  props: CardProps & {
    context: KpiCardRendererContext;
    persist?: KpiSnapshotPayload | null;
    minIntervalMs?: number;
  }
) {
  const { context, persist, minIntervalMs, ...cardProps } = props;

  usePersistKpiSnapshot(context, persist, { minIntervalMs });

  return (
    <KpiCard
      {...cardProps}
      // default locale from context if caller didn’t pass one
      locale={cardProps.locale ?? context.locale}
    />
  );
}
