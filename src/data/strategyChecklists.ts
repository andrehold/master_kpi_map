// src/data/strategyChecklists.ts
import { KPI_IDS, type KpiId } from "../kpi/kpiIds";
import type { StrategyKey } from "./kpis";
import { STRATEGY_CATALOG } from "./kpis";

/**
 * Tone mapping for KPI bands – keep in sync with your band system if needed.
 */
export type ChecklistTone = "good" | "caution" | "avoid" | "neutral";

/**
 * Which section of the checklist a rule belongs to.
 */
export type StrategyChecklistSection = "global" | "trade" | "risk";

/**
 * Configuration for a single rule in the Pre-Trade Check.
 *
 * NOTE: We keep this config declarative – the actual evaluation logic lives
 * in the view-model (useStrategyChecklist) and is keyed on kpiId and rule.id.
 */
export type StrategyRuleConfig = {
  id: string; // must be unique within a strategy, e.g. "horizon.condor_credit_band"
  label: string;
  section: StrategyChecklistSection;
  severity: "hard" | "soft";
  /**
   * Optional: link this rule to a single KPI – the evaluator can then derive
   * pass / warn / fail from the KPI band tone, without duplicating thresholds.
   */
  kpiId?: KpiId;
};

/**
 * Template for a single leg in the trade kit.
 * This is "static intent" – the live legs with strikes/greeks come from hooks.
 */
export type StrategyLegTemplate = {
  id: string; // stable id used to join with live TradeKitState
  label: string;
  side: "long" | "short";
  optionType: "call" | "put";
  strikeSelection: "atm" | "otm_pct" | "fixed_offset" | "custom";
  strikeOffsetPct?: number; // e.g. -0.03 for 3% OTM
  contractsDefault?: number;
};

/**
 * Trade-kit specific configuration.
 * summaryMetricIds are keys into TradeKitState.summary.
 */
export type StrategyTradeKitConfig = {
  legs: StrategyLegTemplate[];
  summaryMetricIds: string[];
};

export type StrategyChecklistConfig = {
  strategyKey: StrategyKey;
  name: string;
  /**
   * KPI ids to show in the "Global KPIs" section.
   * Usually derived from STRATEGY_CATALOG.primaryKpis plus a few extras.
   */
  globalKpis: KpiId[];
  /**
   * Trade kit structure (legs + summary metrics). Live values
   * are provided by hooks via TradeKitState.
   */
  tradeKit: StrategyTradeKitConfig;
  /**
   * Pre-trade rules which will be evaluated against KPI tones and
   * trade kit summary metrics.
   */
  rules: StrategyRuleConfig[];
};

/**
 * Per-strategy checklist configuration.
 * You can extend this over time as you wire up more strategies.
 */
export const STRATEGY_CHECKLISTS: Record<StrategyKey, StrategyChecklistConfig> = {
  // ---------------------------------------------------------------------------
  // Horizon – EM iron condor
  // ---------------------------------------------------------------------------
  horizon: {
    strategyKey: "horizon",
    name: STRATEGY_CATALOG.horizon.name,
    globalKpis: [
      ...STRATEGY_CATALOG.horizon.primaryKpis,
      KPI_IDS.condorCredit,
      KPI_IDS.maxlossCredit,
      KPI_IDS.pnlVsCredit,
    ],
    tradeKit: {
      legs: [
        {
          id: "short_put",
          label: "Short put (−EM)",
          side: "short",
          optionType: "put",
          strikeSelection: "otm_pct",
          strikeOffsetPct: -1.0, // ≈ −1×EM relative to spot
          contractsDefault: 1,
        },
        {
          id: "short_call",
          label: "Short call (+EM)",
          side: "short",
          optionType: "call",
          strikeSelection: "otm_pct",
          strikeOffsetPct: 1.0,
          contractsDefault: 1,
        },
        {
          id: "long_put_hedge",
          label: "Long put hedge (−1.6×EM)",
          side: "long",
          optionType: "put",
          strikeSelection: "otm_pct",
          strikeOffsetPct: -1.6,
          contractsDefault: 1,
        },
        {
          id: "long_call_hedge",
          label: "Long call hedge (+1.6×EM)",
          side: "long",
          optionType: "call",
          strikeSelection: "otm_pct",
          strikeOffsetPct: 1.6,
          contractsDefault: 1,
        },
      ],
      summaryMetricIds: [
        "totalCredit",
        "maxProfit",
        "maxLoss",
        "rr", // risk–reward
      ],
    },
    rules: [
      {
        id: "horizon.condor_credit_band",
        label: "Condor credit in target band",
        section: "global",
        severity: "hard",
        kpiId: KPI_IDS.condorCredit,
      },
      {
        id: "horizon.maxloss_credit_ratio",
        label: "Max loss ÷ credit within limit",
        section: "risk",
        severity: "hard",
        kpiId: KPI_IDS.maxlossCredit,
      },
      {
        id: "horizon.pnl_vs_credit_health",
        label: "Realized PnL vs credit within acceptable band",
        section: "risk",
        severity: "soft",
        kpiId: KPI_IDS.pnlVsCredit,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Carry Trade – funding/basis carry
  // ---------------------------------------------------------------------------
  carry: {
    strategyKey: "carry",
    name: STRATEGY_CATALOG.carry.name,
    globalKpis: [...STRATEGY_CATALOG.carry.primaryKpis],
    tradeKit: {
      legs: [],
      summaryMetricIds: [],
    },
    rules: [
      {
        id: "carry.funding_band",
        label: "Funding in acceptable band",
        section: "global",
        severity: "hard",
        kpiId: KPI_IDS.funding,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 0DTE overwrite
  // ---------------------------------------------------------------------------
  odte: {
    strategyKey: "odte",
    name: STRATEGY_CATALOG.odte.name,
    globalKpis: [...STRATEGY_CATALOG.odte.primaryKpis],
    tradeKit: {
      legs: [],
      summaryMetricIds: [],
    },
    rules: [],
  },

  // ---------------------------------------------------------------------------
  // Range-bound premium
  // ---------------------------------------------------------------------------
  range: {
    strategyKey: "range",
    name: STRATEGY_CATALOG.range.name,
    globalKpis: [...STRATEGY_CATALOG.range.primaryKpis],
    tradeKit: {
      legs: [],
      summaryMetricIds: [],
    },
    rules: [],
  },

  // ---------------------------------------------------------------------------
  // Weekend Vol – this is where your weekend playbook hooks in
  // ---------------------------------------------------------------------------
  weekend: {
    strategyKey: "weekend",
    name: STRATEGY_CATALOG.weekend.name,
    globalKpis: [
      ...STRATEGY_CATALOG.weekend.primaryKpis,
      KPI_IDS.ivr, // use IVR as an additional global filter
    ],
    tradeKit: {
      legs: [
        {
          id: "short_weekend_vol",
          label: "Short weekend vol (1w ATM)",
          side: "short",
          optionType: "call", // actual composition comes from your weekend hook
          strikeSelection: "atm",
          contractsDefault: 1,
        },
      ],
      summaryMetricIds: [
        "totalDebit",
        "thetaCapture",
        "rr",
      ],
    },
    rules: [
      {
        id: "weekend.ivr_min",
        label: "IV Rank in supportive regime",
        section: "global",
        severity: "hard",
        kpiId: KPI_IDS.ivr,
      },
      {
        id: "weekend.funding_band",
        label: "Funding not prohibitive",
        section: "global",
        severity: "hard",
        kpiId: KPI_IDS.funding,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Parity Edge
  // ---------------------------------------------------------------------------
  parity: {
    strategyKey: "parity",
    name: STRATEGY_CATALOG.parity.name,
    globalKpis: [...STRATEGY_CATALOG.parity.primaryKpis],
    tradeKit: {
      legs: [],
      summaryMetricIds: [],
    },
    rules: [],
  },

  // ---------------------------------------------------------------------------
  // Box Financing
  // ---------------------------------------------------------------------------
  box: {
    strategyKey: "box",
    name: STRATEGY_CATALOG.box.name,
    globalKpis: [...STRATEGY_CATALOG.box.primaryKpis],
    tradeKit: {
      legs: [],
      summaryMetricIds: [],
    },
    rules: [
      {
        id: "box.spread_band",
        label: "Bid–ask spread acceptable",
        section: "global",
        severity: "hard",
        kpiId: KPI_IDS.spread,
      },
    ],
  },
};
