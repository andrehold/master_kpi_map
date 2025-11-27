import { StrategyKey, STRATEGY_CATALOG } from "../../data/kpis";
import { StrategyChecklistConfig } from "../../data/strategyChecklists";


export const STRATEGY_CHECKLISTS: Record<StrategyKey, StrategyChecklistConfig> = {
    weekend: {
      strategyKey: "weekend",
      name: STRATEGY_CATALOG.weekend.name,
      // reuse primary KPIs from the catalog as base for the Global section
      globalKpis: [
        ...STRATEGY_CATALOG.weekend.primaryKpis,
        // plus extras like IVR, DTE if needed:
        // KPI_IDS.ivr,
        // KPI_IDS.dte,
      ],
      tradeKit: {
        legs: [
          // (for Weekend Vol this might just be "Short 1w ATM" or similar)
        ],
        summaryMetricIds: ["total_debit", "theta_capture", "rr"],
      },
      rules: [
        { id: "ivr_min",    label: "IVR > 40", section: "global", severity: "hard" },
        { id: "dte_range",  label: "DTE between 21–35", section: "trade", severity: "hard" },
        { id: "funding_ok", label: "Funding within range", section: "global", severity: "soft" },
      ],
    },
  
    // horizon, range, etc...
  };
  