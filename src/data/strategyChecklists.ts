import type { StrategyKey, StrategyMeta, KpiId } from "./kpis";
import { STRATEGY_CATALOG } from "./kpis";

export type RuleOutcome = "pass" | "fail" | "warn" | "unknown";

export type StrategyChecklistSection = "global" | "trade" | "risk";

export type StrategyRule = {
  id: string;
  label: string;
  section: StrategyChecklistSection;
  severity: "hard" | "soft";
  // This will run in the view-model, not in this data file:
  // evaluate: (ctx: StrategyContext) => RuleOutcome;
};

export type StrategyLegTemplate = {
  id: string;
  label: string;
  side: "long" | "short";
  optionType: "call" | "put";
  strikeSelection: "atm" | "otm_pct" | "fixed_offset" | "custom";
  strikeOffsetPct?: number;
  contractsDefault?: number;
};

export type StrategyChecklistConfig = {
  strategyKey: StrategyKey;
  name: string;
  // 1) Global KPI section
  globalKpis: KpiId[];

  // 2) Trade kit section
  tradeKit: {
    legs: StrategyLegTemplate[];
    // plus IDs of derived metrics we'll compute in the hook
    summaryMetricIds: string[]; // e.g. ["total_debit", "max_profit", ...]
  };

  // 3) Rules section
  rules: StrategyRule[];
};
