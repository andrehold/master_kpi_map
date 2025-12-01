// src/hooks/model/useChecklistGlobalKpis.ts

import { useMemo } from "react";
import type { StrategyKey } from "../../data/kpis";
import { STRATEGY_CHECKLISTS } from "../../data/strategyChecklists";
import type { GlobalKpiMapForChecklist } from "./useStrategyChecklist";
import { useKpiDashboardState } from "../kpi/useKpiDashboardState";

/**
 * Adapter: takes the central KPI dashboard state and projects it into
 * the shape needed by `useStrategyChecklist`, restricted to the KPIs
 * configured for the given strategy.
 */
export function useChecklistGlobalKpis(
  strategyKey: StrategyKey
): GlobalKpiMapForChecklist {
  const cfg = STRATEGY_CHECKLISTS[strategyKey];
  const { byId } = useKpiDashboardState();

  return useMemo(() => {
    const map: GlobalKpiMapForChecklist = {};

    for (const kpiId of cfg.globalKpis) {
      const src = byId[kpiId];
      if (!src) continue;

      map[kpiId] = {
        value: src.value,
        formatted: src.formatted,
        tone: src.tone,
      };
    }

    console.log("Checklist globalKpis", strategyKey, cfg.globalKpis, map);

    return map;
  }, [cfg, byId]);
}

