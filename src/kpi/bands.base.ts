// src/kpi/bands.base.ts
// Numeric/logic-only corridors for KPI guidance.
// Copy/text (labels, guidance) should live in i18n JSON and be merged at runtime.

export type Tone = "good" | "caution" | "avoid" | "neutral";

export type BandBase = {
  id: string;
  /** Inclusive lower bound (on the KPI's native scale) */
  min?: number;
  /** Exclusive upper bound */
  max?: number;
  /** Traffic-light tone for this corridor */
  tone?: Tone;
};

export type BandBaseSet = {
  /** Registry key, e.g. "ivr" */
  id: string;
  /** Value scale: affects clamping/formatting and whether a 0–100 band bar is sensible */
  valueScale: "percent" | "raw" | "ratio";
  /** Show the mini band bar under the KPI number by default */
  hasBar: boolean;
  /** Ordered low → high thresholds */
  thresholds: BandBase[];
  /** Optional note to document how to compute the value (units, sign convention, etc.) */
  note?: string;
};

export type BandBaseIds = keyof typeof BAND_BASE;

/**
 * IMPORTANT: For spreads that can be negative (e.g., term structure, IV–RV),
 * define the KPI value clearly in `note` so callers compute the same metric.
 */

export const BAND_BASE: Record<string, BandBaseSet> = {
  /* -----------------------------------------------------------------------
   * 1) IV & Surface
   * --------------------------------------------------------------------- */
  ivr: {
    id: "ivr",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "low", max: 20, tone: "avoid" },        // vol cheap → avoid naked shorts
      { id: "mid", min: 30, max: 70, tone: "good" },// balanced carry zone
      { id: "high", min: 80, tone: "caution" },     // panic/hedge
    ],
    note: "IV Rank / Percentile (1y). Value in % (0–100).",
  },

  atm_iv: {
    id: "atm_iv",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "cheap", max: 20, tone: "caution" },     // crypto majors <20% (equities <15%)
      { id: "normal", min: 20, max: 40, tone: "good" },
      { id: "stress", min: 50, tone: "avoid" },
    ],
    note: "ATM implied vol in % (absolute). If equities, consider <15% as 'cheap'.",
  },

  term_structure_spread: {
    id: "term_structure_spread",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "backwardation", max: -2, tone: "avoid" },  // front > back by >2–3 vol pts
      { id: "flat", min: -2, max: 1, tone: "neutral" },
      { id: "contango", min: 1, tone: "good" },
    ],
    note: "Spread defined as (BackMonthIV − FrontMonthIV) in vol points. Negative = backwardation.",
  },

  skew_rr25: {
    id: "skew_rr25",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "puts_rich", max: -5, tone: "caution" },  // overweight put wings
      { id: "balanced", min: -5, max: 5, tone: "neutral" },
      { id: "calls_rich", min: 5, tone: "good" },     // call overwrite bias
    ],
    note: "25Δ Risk Reversal in vol points (CallIV − PutIV).",
  },

  vol_of_vol: {
    id: "vol_of_vol",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "calm", max: 80, tone: "good" },
      { id: "normal", min: 80, max: 120, tone: "neutral" },
      { id: "stressed", min: 120, tone: "caution" },
    ],
    note: "Proxy such as VVIX or MOVE level (choose instrument-appropriate scale).",
  },

  /* -----------------------------------------------------------------------
   * 2) Realized vs Implied
   * --------------------------------------------------------------------- */
  iv_rv_spread: {
    id: "iv_rv_spread",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "no_edge", max: 0, tone: "avoid" },      // IV − RV < 0
      { id: "weak_edge", min: 0, max: 5, tone: "neutral" },
      { id: "carry_edge", min: 5, max: 15, tone: "good" }, // +5–10 vol pts
      { id: "rich_vol", min: 15, tone: "good" },      // >15 strong short opp
    ],
    note: "IV − RV in vol points (annualized).",
  },

  em_hit_rate_90d: {
    id: "em_hit_rate_90d",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "overpriced_long_edge", max: 50, tone: "caution" }, // long vol edge
      { id: "balanced", min: 60, max: 70, tone: "neutral" },
      { id: "sell_premium", min: 75, tone: "good" },
    ],
    note: "Expected Move hit rate over 90d window, in %.",
  },

  rv_em_ratio: {
    id: "rv_em_ratio",
    valueScale: "ratio",
    hasBar: false,
    thresholds: [
      { id: "em_overpriced", max: 0.8, tone: "good" },   // short vol edge
      { id: "neutral", min: 0.8, max: 1.2, tone: "neutral" },
      { id: "em_underpriced", min: 1.2, tone: "avoid" }, // risky to sell
    ],
    note: "RV ÷ EM (unitless ratio).",
  },

  /* -----------------------------------------------------------------------
   * 3) Market Regime & Macro
   * --------------------------------------------------------------------- */
  vix: {
    id: "vix",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "calm", max: 15, tone: "good" },
      { id: "normal", min: 15, max: 25, tone: "neutral" },
      { id: "stressed", min: 25, tone: "caution" },
    ],
    note: "VIX index level.",
  },

  vvix: {
    id: "vvix",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "stable", max: 80, tone: "good" },
      { id: "normal", min: 80, max: 120, tone: "neutral" },
      { id: "stress", min: 120, tone: "caution" },
    ],
    note: "VVIX index level.",
  },

  funding_rate_annualized: {
    id: "funding_rate_annualized",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "crowded_shorts", max: -10, tone: "caution" },
      { id: "neutral_low", min: -10, max: -5, tone: "neutral" },
      { id: "neutral", min: -5, max: 5, tone: "neutral" },
      { id: "watch_longs", min: 5, max: 10, tone: "neutral" },
      { id: "crowded_longs", min: 10, tone: "caution" },
    ],
    note: "Perpetual funding (annualized, %) — extremes imply squeeze/bounce risk.",
  },

  macro_event_tminus_days: {
    id: "macro_event_tminus_days",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "avoid_new_shorts", max: 1, tone: "avoid" },   // within T–1 day
      { id: "caution_window", min: 1, max: 3, tone: "caution" },
      { id: "normal", min: 3, tone: "good" },
    ],
    note: "Days until major event (Fed/CPI/NFP/ETF rulings). Smaller is closer.",
  },

  /* -----------------------------------------------------------------------
   * 4) Flows & Liquidity
   * --------------------------------------------------------------------- */
  bid_ask_spread_pct: {
    id: "bid_ask_spread_pct",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "healthy", max: 0.5, tone: "good" },
      { id: "caution", min: 0.5, max: 1, tone: "caution" },
      { id: "avoid", min: 1, tone: "avoid" },
    ],
    note: "% of option premium.",
  },

  tob_depth_contracts: {
    id: "tob_depth_contracts",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "illiquid", max: 20, tone: "avoid" },
      { id: "light", min: 20, max: 50, tone: "caution" },
      { id: "safe", min: 50, tone: "good" },
    ],
    note: "Top-of-book depth per strike (contracts).",
  },

  oi_concentration_pct: {
    id: "oi_concentration_pct",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "normal", max: 20, tone: "good" },
      { id: "elevated", min: 20, max: 30, tone: "neutral" },
      { id: "pin_risk", min: 30, max: 40, tone: "caution" },
      { id: "very_high", min: 40, tone: "avoid" },
    ],
    note: "% of total OI sitting at a single strike.",
  },

  liquidityStress: {
    id: "liquidityStress",
    valueScale: "percent",   // guidanceValue should be 0–100
    hasBar: true,
    thresholds: [
      { id: "healthy", max: 30, tone: "good" },
      { id: "watch",   min: 30, max: 60, tone: "caution" },
      { id: "stressed", min: 60, tone: "avoid" },
    ],
    note: "Composite 0–100 stress score combining bid–ask spreads and order-book depth for BTC perp plus key option tenors.",
  },

  /* -----------------------------------------------------------------------
   * 5) Strategy-Specific Health
   * --------------------------------------------------------------------- */
  condorCreditEm: {
    id: "condorCreditEm",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "poor_rr", max: 20, tone: "avoid" },
      { id: "ok", min: 20, max: 25, tone: "neutral" },
      { id: "healthy", min: 25, max: 35, tone: "good" },
      { id: "very_rich", min: 40, tone: "good" },
    ],
    note: "Credit as % of Expected Move.",
  },

  maxloss_credit_ratio: {
    id: "maxloss_credit_ratio",
    valueScale: "ratio",
    hasBar: false,
    thresholds: [
      { id: "acceptable", max: 3, tone: "good" },
      { id: "borderline", min: 3, max: 5, tone: "caution" },
      { id: "unattractive", min: 5, tone: "avoid" },
    ],
    note: "Max loss ÷ credit received (unitless).",
  },

  pnl_vs_credit_pct: {
    id: "pnl_vs_credit_pct",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "stop_out", max: -150, tone: "avoid" },
      { id: "drawdown", min: -150, max: 0, tone: "caution" },
      { id: "in_progress", min: 0, max: 50, tone: "neutral" },
      { id: "target_reached", min: 50, tone: "good" },
    ],
    note: "Realized PnL as % of initial credit (negative = loss).",
  },

  delta_exposure_pct_nav: {
    id: "delta_exposure_pct_nav",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "neutral", max: 10, tone: "good" },
      { id: "rebalance", min: 10, max: 20, tone: "caution" },
      { id: "hedge", min: 20, tone: "avoid" },
    ],
    note: "|Delta| as % of NAV-equivalent.",
  },

  gamma_theta_ratio: {
    id: "gamma_theta_ratio",
    valueScale: "ratio",
    hasBar: false,
    thresholds: [
      { id: "safe", max: 1, tone: "good" },
      { id: "elevated", min: 1, max: 2, tone: "caution" },
      { id: "high", min: 2, tone: "avoid" },
    ],
    note: "Gamma risk ÷ daily theta decay.",
  },

  /* -----------------------------------------------------------------------
   * 6) Execution & Costs
   * --------------------------------------------------------------------- */
  fill_ratio_pct: {
    id: "fill_ratio_pct",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "issues", max: 70, tone: "avoid" },
      { id: "friction", min: 70, max: 90, tone: "caution" },
      { id: "healthy", min: 90, tone: "good" },
    ],
    note: "% of orders filled (volume/attempted).",
  },

  arrival_slippage_ticks: {
    id: "arrival_slippage_ticks",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "excellent", max: 0.5, tone: "good" },
      { id: "normal", min: 0.5, max: 1, tone: "neutral" },
      { id: "costly", min: 1, tone: "avoid" },
    ],
    note: "Ticks per leg vs arrival price.",
  },

  breakage_rate_pct: {
    id: "breakage_rate_pct",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "acceptable", max: 5, tone: "good" },
      { id: "workflow_issue", min: 5, max: 10, tone: "caution" },
      { id: "problematic", min: 10, tone: "avoid" },
    ],
    note: "% of multi-leg attempts that fail to fill as a package.",
  },

  /* -----------------------------------------------------------------------
   * 7) Risk & Capital
   * --------------------------------------------------------------------- */
  capital_utilization_pct_nav: {
    id: "capital_utilization_pct_nav",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "conservative", max: 30, tone: "good" },
      { id: "normal", min: 30, max: 50, tone: "neutral" },
      { id: "aggressive", min: 50, max: 70, tone: "caution" },
      { id: "very_high", min: 70, tone: "avoid" },
    ],
    note: "% of NAV at risk across active structures.",
  },

  edge_realized_pct: {
    id: "edge_realized_pct",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "low", max: 60, tone: "avoid" },
      { id: "drag", min: 60, max: 80, tone: "caution" },
      { id: "efficient", min: 80, tone: "good" },
    ],
    note: "Realized edge ÷ locked edge, in %.",
  },

  drawdown_pct_nav: {
    id: "drawdown_pct_nav",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "ok", max: 5, tone: "good" },
      { id: "review", min: 5, max: 10, tone: "caution" },
      { id: "stop_recalibrate", min: 10, tone: "avoid" },
    ],
    note: "Strategy drawdown in % of NAV.",
  },

  /* -----------------------------------------------------------------------
   * 8) Box Financing–Specific
   * --------------------------------------------------------------------- */
  box_financing_spread_bps: {
    id: "box_financing_spread_bps",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "no_trade", max: 0, tone: "avoid" },
      { id: "min_edge", min: 0, max: 5, tone: "neutral" },
      { id: "ok_edge", min: 5, max: 20, tone: "good" },
      { id: "attractive", min: 20, tone: "good" },
    ],
    note: "Implied financing − funding cost, in basis points annualized.",
  },

  slippage_budget_ticks_4legs: {
    id: "slippage_budget_ticks_4legs",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "tolerable", max: 3, tone: "good" },
      { id: "tight", min: 3, max: 5, tone: "caution" },
      { id: "edge_erased", min: 5, tone: "avoid" },
    ],
    note: "Total allowed slippage across 4 legs (ticks).",
  },

  /* -----------------------------------------------------------------------
   * Extras from dashboard context
   * --------------------------------------------------------------------- */
  basis_spread_annualized_pct: {
    id: "basis_spread_annualized_pct",
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { id: "negative", max: 0, tone: "caution" },    // potential unwind risk / long basis opp
      { id: "low", min: 0, max: 5, tone: "neutral" },
      { id: "good", min: 5, max: 15, tone: "good" },
      { id: "very_rich", min: 15, tone: "good" },
    ],
    note: "Spot–perp/futures annualized basis (%).",
  },

  term_structure_kink_abs: {
    id: "term_structure_kink_abs",
    valueScale: "raw",
    hasBar: false,
    thresholds: [
      { id: "flat", max: 3, tone: "neutral" },
      { id: "curved", min: 3, max: 10, tone: "caution" },
      { id: "kinked", min: 10, tone: "avoid" },
    ],
    note: "Absolute kink of IV term structure (vol pts). Compute as local deviation vs smooth fit.",
  },
};

export default BAND_BASE;
