import type { BandBaseIds } from "../kpi/bands.base";

export const STRATEGIES = [
    "Expected Move",
    "Range-Bound Premium",
    "Carry Trade",
    "0DTE Overwrite",
    "Weekend Vol",
    "Parity Edge",
    "Box Financing",
  ] as const;
  
  export type Strategy = typeof STRATEGIES[number];

  export type KpiMeta = {
    id: string;
    title: string;
    strategies?: string[];
    valueType?: "percent" | "raw" | "ratio";
    guidanceKey?: BandBaseIds; // <- link to bands (optional)
  };
  
  export type KPIValueType =
    | "percent"
    | "ratio"
    | "bps"
    | "sigma"
    | "index"
    | "ivrank"
    | "ms"
    | "price"
    | "text"
    | "custom";
  
  export interface KPIDef {
    id: string;
    name: string;
    description?: string;
    strategies: Strategy[];
    valueType: KPIValueType;
  }
  
  export interface KPIGroup {
    id: string;
    title: string;
    kpis: KPIDef[];
  }

  export const KPIS: KpiMeta[] = [
    { id: "ivr", title: "IV Rank (1y)", valueType: "percent", guidanceKey: "ivr" },
    { id: "atm-iv", title: "ATM IV", valueType: "percent", guidanceKey: "atm_iv" },
    { id: "term-structure", title: "Term Structure", guidanceKey: "term_structure_spread" },
    { id: "skew", title: "25Δ Risk Reversal", guidanceKey: "skew_rr25" },
    { id: "vol-of-vol", title: "Vol of Vol", guidanceKey: "vol_of_vol" },
    { id: "iv-rv", title: "IV – RV Spread", guidanceKey: "iv_rv_spread" },
    { id: "em-hit-rate", title: "EM Hit Rate (90d)", valueType: "percent", guidanceKey: "em_hit_rate_90d" },
    { id: "rv-em", title: "RV ÷ EM", valueType: "ratio", guidanceKey: "rv_em_ratio" },
    { id: "vix", title: "VIX", guidanceKey: "vix" },
    { id: "vvix", title: "VVIX", guidanceKey: "vvix" },
    { id: "funding", title: "Funding Rate (ann.)", valueType: "percent", guidanceKey: "funding_rate_annualized" },
    { id: "event-window", title: "Macro Event Window", guidanceKey: "macro_event_tminus_days" },
    { id: "spread", title: "Bid–Ask Spread %", valueType: "percent", guidanceKey: "bid_ask_spread_pct" },
    { id: "tob-depth", title: "TOB Depth", guidanceKey: "tob_depth_contracts" },
    { id: "oi-concentration", title: "OI Concentration %", valueType: "percent", guidanceKey: "oi_concentration_pct" },
    { id: "condor-credit", title: "Condor Credit % of EM", valueType: "percent", guidanceKey: "condor_credit_pct_of_em" },
    { id: "maxloss-credit", title: "Max Loss ÷ Credit", valueType: "ratio", guidanceKey: "maxloss_credit_ratio" },
    { id: "pnl-vs-credit", title: "PnL vs Credit %", valueType: "percent", guidanceKey: "pnl_vs_credit_pct" },
    { id: "delta-exposure", title: "Delta Exposure % NAV", valueType: "percent", guidanceKey: "delta_exposure_pct_nav" },
    { id: "gamma-theta", title: "Gamma ÷ Theta", valueType: "ratio", guidanceKey: "gamma_theta_ratio" },
    { id: "fill-ratio", title: "Fill Ratio %", valueType: "percent", guidanceKey: "fill_ratio_pct" },
    { id: "arrival-slippage", title: "Arrival Slippage", guidanceKey: "arrival_slippage_ticks" },
    { id: "breakage", title: "Breakage Rate %", valueType: "percent", guidanceKey: "breakage_rate_pct" },
    { id: "capital-util", title: "Capital Util % NAV", valueType: "percent", guidanceKey: "capital_utilization_pct_nav" },
    { id: "edge-capture", title: "Edge Capture %", valueType: "percent", guidanceKey: "edge_realized_pct" },
    { id: "drawdown", title: "Drawdown % NAV", valueType: "percent", guidanceKey: "drawdown_pct_nav" },
    { id: "box-spread", title: "Box Financing Spread (bps)", guidanceKey: "box_financing_spread_bps" },
    { id: "box-slippage", title: "Box Slippage (ticks)", guidanceKey: "slippage_budget_ticks_4legs" },
    { id: "basis", title: "Spot–Perp Basis (ann. %)", valueType: "percent", guidanceKey: "basis_spread_annualized_pct" },
    { id: "ts-kink", title: "Term Structure Kink (abs)", guidanceKey: "term_structure_kink_abs" }
  ];
  
  export const KPI_GROUPS: KPIGroup[] = [
    {
      id: "vol-skew",
      title: "1. Volatility & Skew Metrics",
      kpis: [
        { id: "atm-iv", name: "ATM Implied Volatility (IV)", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"], valueType: "percent" },
        { id: "ivr", name: "IV Rank / Percentile (IVR)", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"], valueType: "ivrank" },
        { id: "term-structure", name: "IV Term Structure (Contango vs Backwardation)", strategies: ["Expected Move", "Carry Trade", "0DTE Overwrite"], valueType: "text" },
        { id: "skew-25d-rr", name: "Skew (25Δ Risk Reversal)", strategies: ["Expected Move", "Weekend Vol", "Carry Trade", "0DTE Overwrite"], valueType: "price" },
        { id: "vol-of-vol", name: "Vol-of-Vol (VVIX/MOVE/intraday IV)", strategies: ["Expected Move", "0DTE Overwrite"], valueType: "index" },
        { id: "ts-kink", name: "Term Structure Kink (0DTE vs 1–3DTE IV)", strategies: ["0DTE Overwrite"], valueType: "percent" },
      ],
    },
    {
      id: "rv-vs-iv",
      title: "2. Realized vs Implied (RV vs IV)",
      kpis: [
        { id: "rv", name: "Realized Volatility (RV)", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"], valueType: "percent" },
        { id: "iv-rv-spread", name: "IV–RV Spread", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade"], valueType: "percent" },
        { id: "em-hit-rate", name: "Hit Rate of Expected Move", strategies: ["Expected Move"], valueType: "percent" },
        { id: "rv-em-factor", name: "Over/Under Pricing Factor (RV ÷ EM)", strategies: ["Expected Move"], valueType: "ratio" },
        { id: "short-horizon-atr", name: "Short-horizon realized σ / intraday ATR vs EM", strategies: ["0DTE Overwrite"], valueType: "sigma" },
        { id: "em-ribbon", name: "Expected Move Ribbon", strategies: ["Expected Move"], valueType: "custom" },
      ],
    },
    {
      id: "regime-macro",
      title: "3. Market Regime & Macro Filters",
      kpis: [
        { id: "vix-vvix", name: "VIX / VVIX levels & jumps", strategies: ["Expected Move"], valueType: "index" },
        { id: "cross-asset-vol", name: "Cross-asset vol benchmarks (MOVE/FX/Credit)", strategies: ["Expected Move"], valueType: "index" },
        { id: "implied-corr", name: "Equity correlation (implied correlation index)", strategies: ["Expected Move"], valueType: "percent" },
        { id: "macro-events", name: "Macro risk events (Fed/CPI/NFP/etc.)", strategies: ["Expected Move", "Weekend Vol", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite", "Box Financing"], valueType: "text" },
        { id: "event-collapse", name: "Event premium collapse", strategies: ["Carry Trade"], valueType: "percent" },
      ],
    },
    {
      id: "micro-flow",
      title: "4. Microstructure, Flows & Liquidity",
      kpis: [
        { id: "funding", name: "Funding rates (perps)", strategies: ["Weekend Vol", "Range-Bound Premium", "0DTE Overwrite"], valueType: "percent" },
        { id: "basis", name: "Spot–perp / futures basis", strategies: ["0DTE Overwrite", "Parity Edge", "Box Financing"], valueType: "percent" },
        { id: "oi-concentration", name: "Open interest concentration (pin risk)", strategies: ["Weekend Vol", "Parity Edge", "0DTE Overwrite"], valueType: "percent" },
        { id: "gammaWalls", name: "Gamma “walls” near strikes", strategies: ["0DTE Overwrite", "Parity Edge"], valueType: "price" },
        { id: "liquidity-stress", name: "Liquidity stress (spreads/depth)", strategies: ["Expected Move", "Weekend Vol", "Range-Bound Premium", "Parity Edge", "0DTE Overwrite", "Box Financing"], valueType: "percent" },
        { id: "orderbook-health", name: "Order book slope / staleness / depth resilience", strategies: ["Parity Edge"], valueType: "percent" },
      ],
    },
    {
      id: "strategy-health",
      title: "5. Strategy-Specific Health Metrics",
      kpis: [
        { id: "condor-credit-em", name: "Condor Credit % of EM", strategies: ["Expected Move"], valueType: "percent" },
        { id: "maxloss-credit", name: "Max Loss ÷ Expected Credit Ratio", strategies: ["Expected Move"], valueType: "ratio" },
        { id: "delta-gamma-near-shorts", name: "Delta & Gamma exposure near short strikes", strategies: ["Expected Move", "Range-Bound Premium"], valueType: "price" },
        { id: "portfolio-vega-theta", name: "Portfolio Vega & Theta exposure", strategies: ["Expected Move", "Carry Trade"], valueType: "price" },
        { id: "pnl-vs-premium", name: "Position PnL vs Premium Collected", strategies: ["Range-Bound Premium"], valueType: "percent" },
        { id: "reversion-half-life", name: "Reversion half-life of Δ (parity dev)", strategies: ["Parity Edge"], valueType: "price" },
        { id: "edge-z", name: "Edge z-score", strategies: ["Parity Edge"], valueType: "sigma" },
        { id: "box-financing-spread", name: "Box financing spread (r_imp – CoC)", strategies: ["Box Financing"], valueType: "bps" },
        { id: "ex-div-early-ex", name: "Ex-dividend / early exercise risk", strategies: ["Box Financing"], valueType: "percent" },
      ],
    },
    {
      id: "execution-costs",
      title: "6. Execution & Cost KPIs",
      kpis: [
        { id: "fill-ratio", name: "Fill ratio", strategies: ["Parity Edge"], valueType: "percent" },
        { id: "maker-taker", name: "Maker/taker rate & rebates", strategies: ["Parity Edge"], valueType: "percent" },
        { id: "slippage", name: "Arrival price slippage (per leg, per kit)", strategies: ["Parity Edge", "Box Financing"], valueType: "bps" },
        { id: "legging-risk", name: "Legging risk realized", strategies: ["Parity Edge"], valueType: "percent" },
        { id: "time-to-fill", name: "Time-to-fill & reprice count", strategies: ["Parity Edge"], valueType: "ms" },
        { id: "breakage", name: "Breakage rate", strategies: ["Parity Edge"], valueType: "percent" },
        { id: "fees-spread", name: "Total fees & effective spread paid", strategies: ["Parity Edge", "Box Financing"], valueType: "bps" },
        { id: "infra-errors", name: "Infra costs & error rates", strategies: ["Parity Edge", "Box Financing"], valueType: "percent" },
      ],
    },
    {
      id: "risk-pnl",
      title: "7. Risk, Capital & P&L",
      kpis: [
        { id: "max-dd-calmar", name: "Max drawdown & Calmar ratio", strategies: ["Expected Move"], valueType: "percent" },
        { id: "locked-vs-realized", name: "Locked vs realized edge (capture ratio)", strategies: ["Parity Edge"], valueType: "percent" },
        { id: "stress-tests", name: "Stress tests (±Y% spot, liquidity haircut)", strategies: ["Parity Edge", "Expected Move"], valueType: "percent" },
        { id: "capital-utilization", name: "Capital utilization / margin footprint (Reg-T vs PM)", strategies: ["Box Financing", "Parity Edge"], valueType: "percent" },
        { id: "concentration-limits", name: "Concentration limits", strategies: ["Parity Edge", "Box Financing"], valueType: "percent" },
        { id: "utilization-vs-caps", name: "Utilization vs daily/expiry risk caps", strategies: ["Carry Trade", "Parity Edge", "Box Financing"], valueType: "percent" },
      ],
    },
    {
      id: "ops-process",
      title: "8. Operational & Process Health",
      kpis: [
        { id: "latency", name: "Latency (e2e ms)", strategies: ["Parity Edge"], valueType: "ms" },
        { id: "data-freshness", name: "Data freshness (book staleness %)", strategies: ["Parity Edge"], valueType: "percent" },
        { id: "uptime", name: "Automation uptime / kill-switch triggers", strategies: ["Parity Edge"], valueType: "percent" },
      ],
    },
  ];
  
  export const ALL_KPIS = KPI_GROUPS.flatMap((g) => g.kpis.map((k) => k.id));

  // ---- KPI Info (drawer "Info" tab) ----------------------------------------
export type KpiInfoDoc = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const KPI_INFO: Record<string, KpiInfoDoc> = {
  ivr: {
    title: "Implied Volatility Rank (IVR)",
    paragraphs: [
      "Definition: IVR ranks today’s implied volatility against the last 52 weeks (0–100). 0 = low end; 100 = high end.",
      "Formula (intuition): IVR ≈ percentile(today’s IV, lookback window). We proxy IV with Deribit DVOL (30D) and compute a ~365d percentile."
    ],
    bullets: [
      "Use: High IVR → consider short premium; Low IVR → long-vol / debit structures.",
      "Note: IVR measures level, not skew or term; check those separately."
    ]
  },
  gammaWalls: {
    title: "Gamma “walls” near strikes",
    paragraphs: [
      "Definition: Concentrations of option gamma at specific strikes can act like “walls” that absorb or amplify price moves. We aggregate absolute gamma by strike (using OI × model gamma per contract) and highlight the largest nodes within a configurable ±window around spot.",
      "Computation: For listed options we approximate net gamma per strike from public data (OI, contract specs, greeks) and sum across calls/puts and nearby expiries. We surface the top N strikes by absolute gamma in the window and show their distance from spot.",
      "Why it matters: Dealer positioning can turn large gamma nodes into temporary support/resistance. When the street is long gamma, hedging flows tend to dampen moves toward a wall (pinning). When short gamma dominates, breaks through walls can accelerate as hedges flip.",
      "How to read: Look for thick clusters close to spot and for walls that persist across sessions or grow into expiry. Confluence with round numbers and high OI strikes increases relevance. Rapid migration of walls after big spot moves is a caution flag.",
      "Caveats: This is an OI-based approximation — it does not see dealer inventory or block trades, and intraday OI updates can lag. Exchange coverage may be incomplete. On event days, wall effects can be overwhelmed by directional flows and liquidity gaps."
    ],
    bullets: [
      "Trading implications: Pinning risk rises into expiry near the largest wall; consider adjusting strikes/widths for short-premium or gamma scalping tactics.",
      "Combine with: Delta & Gamma near shorts, Funding/Basis, OI concentration %, and Liquidity/Depth to gauge fragility.",
      "Risks: Walls can disappear as positions roll; slippage increases around gaps; don’t overfit to a single session."
    ]
  },
};

  