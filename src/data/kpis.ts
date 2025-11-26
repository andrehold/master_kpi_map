import type { BandBaseIds } from "../kpi/bands.base";
import { KPI_IDS, type KpiId } from "../kpi/kpiIds";

export type { KpiId };

export type KpiMeta = {
  id: KpiId;
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
  id: KpiId;
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
  { id: KPI_IDS.ivr, title: "IV Rank (1y)", valueType: "percent", guidanceKey: "ivr" },
  { id: KPI_IDS.atmIv, title: "ATM IV", valueType: "percent", guidanceKey: "atm_iv" },
  { id: KPI_IDS.termStructure, title: "Term Structure", guidanceKey: "term_structure_spread" },
  { id: KPI_IDS.skew, title: "25Δ Risk Reversal", guidanceKey: "skew_rr25" },
  { id: KPI_IDS.volOfVol, title: "Vol of Vol", guidanceKey: "vol_of_vol" },
  { id: KPI_IDS.ivRv, title: "IV – RV Spread", guidanceKey: "iv_rv_spread" },
  { id: KPI_IDS.emHitRate, title: "EM Hit Rate (90d)", valueType: "percent", guidanceKey: "em_hit_rate_90d" },
  { id: KPI_IDS.rvEm, title: "RV ÷ EM", valueType: "ratio", guidanceKey: "rv_em_ratio" },
  { id: KPI_IDS.vix, title: "VIX", guidanceKey: "vix" },
  { id: KPI_IDS.vvix, title: "VVIX", guidanceKey: "vvix" },
  { id: KPI_IDS.funding, title: "Funding Rate (ann.)", valueType: "percent", guidanceKey: "funding_rate_annualized" },
  { id: KPI_IDS.eventWindow, title: "Macro Event Window", guidanceKey: "macro_event_tminus_days" },
  { id: KPI_IDS.spread, title: "Bid–Ask Spread %", valueType: "percent", guidanceKey: "bid_ask_spread_pct" },
  { id: KPI_IDS.tobDepth, title: "TOB Depth", guidanceKey: "tob_depth_contracts" },
  { id: KPI_IDS.liquidityStress, title: "Liquidity Stress (spreads/depth)", valueType: "percent", guidanceKey: "liquidityStress" },
  { id: KPI_IDS.oiConcentration, title: "OI Concentration %", valueType: "percent", guidanceKey: "oi_concentration_pct" },
  { id: KPI_IDS.condorCredit, title: "Condor Credit % of EM", valueType: "percent", guidanceKey: "condor_credit_pct_of_em" },
  { id: KPI_IDS.maxlossCredit, title: "Max Loss ÷ Credit", valueType: "ratio", guidanceKey: "maxloss_credit_ratio" },
  { id: KPI_IDS.pnlVsCredit, title: "PnL vs Credit %", valueType: "percent", guidanceKey: "pnl_vs_credit_pct" },
  { id: KPI_IDS.deltaExposure, title: "Delta Exposure % NAV", valueType: "percent", guidanceKey: "delta_exposure_pct_nav" },
  { id: KPI_IDS.gammaTheta, title: "Gamma ÷ Theta", valueType: "ratio", guidanceKey: "gamma_theta_ratio" },
  { id: KPI_IDS.fillRatio, title: "Fill Ratio %", valueType: "percent", guidanceKey: "fill_ratio_pct" },
  { id: KPI_IDS.arrivalSlippage, title: "Arrival Slippage", guidanceKey: "arrival_slippage_ticks" },
  { id: KPI_IDS.breakage, title: "Breakage Rate %", valueType: "percent", guidanceKey: "breakage_rate_pct" },
  { id: KPI_IDS.capitalUtil, title: "Capital Util % NAV", valueType: "percent", guidanceKey: "capital_utilization_pct_nav" },
  { id: KPI_IDS.edgeCapture, title: "Edge Capture %", valueType: "percent", guidanceKey: "edge_realized_pct" },
  { id: KPI_IDS.drawdown, title: "Drawdown % NAV", valueType: "percent", guidanceKey: "drawdown_pct_nav" },
  { id: KPI_IDS.boxSpread, title: "Box Financing Spread (bps)", guidanceKey: "box_financing_spread_bps" },
  { id: KPI_IDS.boxSlippage, title: "Box Slippage (ticks)", guidanceKey: "slippage_budget_ticks_4legs" },
  { id: KPI_IDS.basis, title: "Spot–Perp Basis (ann. %)", valueType: "percent", guidanceKey: "basis_spread_annualized_pct" },
  { id: KPI_IDS.tsKink, title: "Term Structure Kink (abs)", guidanceKey: "term_structure_kink_abs" },
  {
    id: KPI_IDS.strikeMap,
    title: "Strike support / resistance",
    guidanceKey: "strikeMap", // ⬅️ must match BAND_BASE key
  },
];

export const KPI_GROUPS: KPIGroup[] = [
  {
    id: "vol-skew",
    title: "1. Volatility & Skew Metrics",
    kpis: [
      { id: KPI_IDS.atmIv, name: "ATM Implied Volatility (IV)", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"], valueType: "percent" },
      { id: KPI_IDS.ivr, name: "IV Rank / Percentile (IVR)", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"], valueType: "ivrank" },
      { id: KPI_IDS.termStructure, name: "IV Term Structure", strategies: ["Expected Move", "Carry Trade", "0DTE Overwrite"], valueType: "text" },
      { id: KPI_IDS.skew25dRr, name: "Skew (25Δ Risk Reversal)", strategies: ["Expected Move", "Weekend Vol", "Carry Trade", "0DTE Overwrite"], valueType: "price" },
      { id: KPI_IDS.volOfVol, name: "Vol-of-Vol (VVIX/MOVE/intraday IV)", strategies: ["Expected Move", "0DTE Overwrite"], valueType: "index" },
      { id: KPI_IDS.tsKink, name: "Term Structure Kink (0DTE vs 1–3DTE IV)", strategies: ["0DTE Overwrite"], valueType: "percent" },
    ],
  },
  {
    id: "rv-vs-iv",
    title: "2. Realized vs Implied (RV vs IV)",
    kpis: [
      { id: KPI_IDS.rv, name: "Realized Volatility (RV)", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"], valueType: "percent" },
      { id: KPI_IDS.ivRvSpread, name: "IV–RV Spread", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade"], valueType: "percent" },
      { id: KPI_IDS.emHitRate, name: "Hit Rate of Expected Move", strategies: ["Expected Move"], valueType: "percent" },
      { id: KPI_IDS.rvEmFactor, name: "Over/Under Pricing Factor (RV ÷ EM)", strategies: ["Expected Move"], valueType: "ratio" },
      { id: KPI_IDS.shortHorizonAtr, name: "Short-horizon realized σ / intraday ATR vs EM", strategies: ["0DTE Overwrite"], valueType: "sigma" },
      { id: KPI_IDS.emRibbon, name: "Expected Move Ribbon", strategies: ["Expected Move"], valueType: "custom" },
    ],
  },
  {
    id: "regime-macro",
    title: "3. Market Regime & Macro Filters",
    kpis: [
      { id: KPI_IDS.vixVvix, name: "VIX / VVIX levels & jumps", strategies: ["Expected Move"], valueType: "index" },
      { id: KPI_IDS.crossAssetVol, name: "Cross-asset vol benchmarks (MOVE/FX/Credit)", strategies: ["Expected Move"], valueType: "index" },
      { id: KPI_IDS.impliedCorr, name: "Equity correlation (implied correlation index)", strategies: ["Expected Move"], valueType: "percent" },
      { id: KPI_IDS.macroEvents, name: "Macro risk events (Fed/CPI/NFP/etc.)", strategies: ["Expected Move", "Weekend Vol", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite", "Box Financing"], valueType: "text" },
      { id: KPI_IDS.eventCollapse, name: "Event premium collapse", strategies: ["Carry Trade"], valueType: "percent" },
    ],
  },
  {
    id: "micro-flow",
    title: "4. Microstructure, Flows & Liquidity",
    kpis: [
      { id: KPI_IDS.funding, name: "Funding rates (perps)", strategies: ["Weekend Vol", "Range-Bound Premium", "0DTE Overwrite"], valueType: "percent" },
      { id: KPI_IDS.basis, name: "Spot–perp / futures basis", strategies: ["0DTE Overwrite", "Parity Edge", "Box Financing"], valueType: "percent" },
      { id: KPI_IDS.oiConcentration, name: "Open interest concentration (pin risk)", strategies: ["Weekend Vol", "Parity Edge", "0DTE Overwrite"], valueType: "percent" },
      { id: KPI_IDS.gammaWalls, name: "Gamma “walls” near strikes", strategies: ["0DTE Overwrite", "Parity Edge"], valueType: "price" },
      { id: KPI_IDS.liquidityStress, name: "Liquidity stress (spreads/depth)", strategies: ["Expected Move", "Weekend Vol", "Range-Bound Premium", "Parity Edge", "0DTE Overwrite", "Box Financing"], valueType: "percent" },
      { id: KPI_IDS.orderbookHealth, name: "Order book slope / staleness / depth resilience", strategies: ["Parity Edge"], valueType: "percent" },
    ],
  },
  {
    id: "strategy-health",
    title: "5. Strategy-Specific Health Metrics",
    kpis: [
      { id: KPI_IDS.condorCreditEm, name: "Condor Credit % of EM", strategies: ["Expected Move"], valueType: "percent" },
      { id: KPI_IDS.maxlossCredit, name: "Max Loss ÷ Expected Credit Ratio", strategies: ["Expected Move"], valueType: "ratio" },
      { id: KPI_IDS.deltaGammaNearShorts, name: "Delta & Gamma exposure near short strikes", strategies: ["Expected Move", "Range-Bound Premium"], valueType: "price" },
      { id: KPI_IDS.portfolioVegaTheta, name: "Portfolio Vega & Theta exposure", strategies: ["Expected Move", "Carry Trade"], valueType: "price" },
      { id: KPI_IDS.pnlVsPremium, name: "Position PnL vs Premium Collected", strategies: ["Range-Bound Premium"], valueType: "percent" },
      { id: KPI_IDS.reversionHalfLife, name: "Reversion half-life of Δ (parity dev)", strategies: ["Parity Edge"], valueType: "price" },
      { id: KPI_IDS.edgeZ, name: "Edge z-score", strategies: ["Parity Edge"], valueType: "sigma" },
      { id: KPI_IDS.boxFinancingSpread, name: "Box financing spread (r_imp – CoC)", strategies: ["Box Financing"], valueType: "bps" },
      { id: KPI_IDS.exDivEarlyEx, name: "Ex-dividend / early exercise risk", strategies: ["Box Financing"], valueType: "percent" },
    ],
  },
  {
    id: "execution-costs",
    title: "6. Execution & Cost KPIs",
    kpis: [
      { id: KPI_IDS.fillRatio, name: "Fill ratio", strategies: ["Parity Edge"], valueType: "percent" },
      { id: KPI_IDS.makerTaker, name: "Maker/taker rate & rebates", strategies: ["Parity Edge"], valueType: "percent" },
      { id: KPI_IDS.slippage, name: "Arrival price slippage (per leg, per kit)", strategies: ["Parity Edge", "Box Financing"], valueType: "bps" },
      { id: KPI_IDS.leggingRisk, name: "Legging risk realized", strategies: ["Parity Edge"], valueType: "percent" },
      { id: KPI_IDS.timeToFill, name: "Time-to-fill & reprice count", strategies: ["Parity Edge"], valueType: "ms" },
      { id: KPI_IDS.breakage, name: "Breakage rate", strategies: ["Parity Edge"], valueType: "percent" },
      { id: KPI_IDS.feesSpread, name: "Total fees & effective spread paid", strategies: ["Parity Edge", "Box Financing"], valueType: "bps" },
      { id: KPI_IDS.infraErrors, name: "Infra costs & error rates", strategies: ["Parity Edge", "Box Financing"], valueType: "percent" },
    ],
  },
  {
    id: "risk-pnl",
    title: "7. Risk, Capital & P&L",
    kpis: [
      { id: KPI_IDS.maxDdCalmar, name: "Max drawdown & Calmar ratio", strategies: ["Expected Move"], valueType: "percent" },
      { id: KPI_IDS.lockedVsRealized, name: "Locked vs realized edge (capture ratio)", strategies: ["Parity Edge"], valueType: "percent" },
      { id: KPI_IDS.stressTests, name: "Stress tests (±Y% spot, liquidity haircut)", strategies: ["Parity Edge", "Expected Move"], valueType: "percent" },
      { id: KPI_IDS.capitalUtilization, name: "Capital utilization / margin footprint (Reg-T vs PM)", strategies: ["Box Financing", "Parity Edge"], valueType: "percent" },
      { id: KPI_IDS.concentrationLimits, name: "Concentration limits", strategies: ["Parity Edge", "Box Financing"], valueType: "percent" },
      { id: KPI_IDS.utilizationVsCaps, name: "Utilization vs daily/expiry risk caps", strategies: ["Carry Trade", "Parity Edge", "Box Financing"], valueType: "percent" },
    ],
  },
  {
    id: "ops-process",
    title: "8. Operational & Process Health",
    kpis: [
      { id: KPI_IDS.latency, name: "Latency (e2e ms)", strategies: ["Parity Edge"], valueType: "ms" },
      { id: KPI_IDS.dataFreshness, name: "Data freshness (book staleness %)", strategies: ["Parity Edge"], valueType: "percent" },
      { id: KPI_IDS.uptime, name: "Automation uptime / kill-switch triggers", strategies: ["Parity Edge"], valueType: "percent" },
    ],
  },
  {
    id: "strikes-positioning",
    title: "Strikes & Positioning",
    kpis: [
      {
        id: KPI_IDS.strikeMap,
        name: "Strike support / resistance",
        strategies: ["Weekend Vol", "0DTE Overwrite"],
        valueType: "price",
      },
    ],
  },
  {
    id: "client-portfolios",
    title: "9. Client Portfolios",
    kpis: [
      {
        id: KPI_IDS.portfolioClientAlpha,
        name: "Client Alpha",
        strategies: [],        // cross-strategy view
        valueType: "text",     // mixed metrics in one card
      },
      {
        id: KPI_IDS.portfolioClientBravo,
        name: "Client Bravo",
        strategies: [],
        valueType: "text",
      },
      {
        id: KPI_IDS.portfolioClientCharlie,
        name: "Client Charlie",
        strategies: [],
        valueType: "text",
      },
      {
        id: KPI_IDS.portfolioClientDelta,
        name: "Client Delta",
        strategies: [],
        valueType: "text",
      },
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

export const KPI_INFO: Partial<Record<KpiId, KpiInfoDoc>> = {
  [KPI_IDS.ivr]: {
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
  [KPI_IDS.gammaWalls]: {
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
  [KPI_IDS.liquidityStress]: {
    title: "Liquidity stress (spreads/depth)",
    paragraphs: [
      "Definition: Composite 0–100% stress score that combines bid–ask spreads and top-of-book depth for the key BTC option expiries you care about (e.g. ~3D and ~30D). 0% = very healthy order books; 100% = highly stressed with wide spreads and thin depth.",
      "Computation (intuition): For each tenor we look at near-the-money options inside a small ±% window around the future price, measure spreads in basis points and the executable size up to your configured clip, normalise vs a “good” baseline, then aggregate across tenors into a worst-case / average stress number.",
      "Why it matters: When spreads blow out and usable depth disappears, even strong strategy signals become hard to monetise—slippage, partial fills and legging risk can easily eat the theoretical edge, especially on multi-leg structures."
    ],
    bullets: [
      "How to read: <30% → healthy liquidity; 30–60% → caution (reduce clip, be patient with limits); >60% → stressed—avoid pushing new size or complex boxes/condors.",
      "Best use: Combine with OI concentration, Gamma walls and Funding/Basis to decide whether to deploy a signal now or wait until liquidity normalises.",
      "Caveats: Only reflects Deribit books around the chosen strikes; off-screen size, hidden orders and other venues are not visible, and conditions can change quickly around events."
    ]
  },
  [KPI_IDS.condorCreditEm]: {
    title: "Condor Credit % of Expected Move",
    paragraphs: [
      "Definition: compares the net credit of a short BTC iron condor to the 30-day expected move (≈1σ) implied by options.",
      "Interpretation: the higher the percentage, the more you are paid per unit of expected movement; very low values usually mean poor risk/reward for a defined-risk short-vol structure."
    ],
    bullets: [
      "Rule of thumb for BTC 30D: <20% = weak; 20–25% = borderline; 25–35% = healthy; ≥40% = very rich but double-check RV/EM, skew and event risk.",
      "Here we use BTC options, ~30-calendar-day expiries and a symmetric condor around spot; EM is the 1σ move based on DVOL.",
      "Use alongside IVR, RV/EM, liquidity and OI concentration when deciding whether to deploy or scale condor risk."
    ]
  },
};

// ==============================
// Strategy catalog
// ==============================

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

export type StrategyKey =
  | "horizon"          // EM-based defined-risk entry
  | "carry"            // Funding/basis carry
  | "odte"             // 0DTE overwrite
  | "range"            // Range-bound premium harvest
  | "weekend"          // Weekend vol
  | "parity"           // Parity edge
  | "box";             // Box financing

export type StrategyMeta = {
  id: StrategyKey;
  name: string;                // display name (menu)
  short?: string;              // brief tag/variant for the menu
  description?: string[];      // optional longer text (drawer/help)
  primaryKpis: KpiId[];        // most relevant KPIs for this strategy
  secondaryKpis?: KpiId[];     // nice-to-have KPIs
  // UI integration hints — use string keys so we avoid function imports here
  actions?: {
    overlayKey?: string;        // string key your UI can route on (any non-empty value enables overlay)
    scanKey?: "horizonScan";
    settingsKey?: "horizonSettings";
    overlayLabel?: string;
    scanLabel?: string;
  };
  // Defaults the UI/scanner can read; optional and strategy-specific
  defaults?: {
    currency?: "BTC" | "ETH";
    targetDte?: number;
    dteMin?: number;
    dteMax?: number;
    shortEmMult?: number;
    hedgeEmMult?: number;
    minCreditUsd?: number;
    maxBaFrac?: number;
  };
};

// Single source of truth your UI can read by id
export const STRATEGY_CATALOG: Record<StrategyKey, StrategyMeta> = {
  horizon: {
    id: "horizon",
    name: "Horizon",
    short: "EM Iron Condor",
    description: [
      "Systematic EM-based, defined-risk entries for BTC options on Deribit.",
      "Short strikes ≈ ±EM×1.0; hedges ≈ ±EM×1.6; filter by min credit and bid/ask quality.",
    ],
    // NOTE: these ids must exist in your KPIS list above
    primaryKpis: [
      KPI_IDS.emRibbon,
      KPI_IDS.ivr,
      KPI_IDS.atmIv,
      KPI_IDS.termStructure,
      KPI_IDS.skew,              // 25Δ RR
      KPI_IDS.rvEmFactor,        // RV ÷ EM
      KPI_IDS.funding,
      KPI_IDS.spotPerpBasis,
      KPI_IDS.gammaWalls,
      KPI_IDS.oiConcentration,
    ],
    secondaryKpis: [
      // add more if you like: "vol-of-vol", "iv-rv", ...
    ],
    actions: {
      overlayKey: "horizon",
      scanKey: "horizonScan",
      settingsKey: "horizonSettings",
      overlayLabel: "Open Horizon Overlay",
      scanLabel: "Scan & Download CSV",
    },
    defaults: {
      currency: "BTC",
      targetDte: 14,
      dteMin: 7,
      dteMax: 21,
      shortEmMult: 1.0,
      hedgeEmMult: 1.6,
      minCreditUsd: 50,
      maxBaFrac: 0.05,
    },
  },

  // Light placeholders (fill out later as you productize each strategy)
  carry: {
    id: "carry",
    name: "Carry Trade",
    short: "Funding/Basis",
    primaryKpis: [KPI_IDS.funding, KPI_IDS.spotPerpBasis, KPI_IDS.ivr, KPI_IDS.termStructure],
  },
  odte: {
    id: "odte",
    name: "0DTE Overwrite",
    short: "Intraday",
    primaryKpis: [KPI_IDS.emRibbon, KPI_IDS.rvEmFactor, KPI_IDS.ivr, KPI_IDS.skew],
  },
  range: {
    id: "range",
    name: "Range-Bound Premium",
    short: "Neutral",
    primaryKpis: [KPI_IDS.ivr, KPI_IDS.skew, KPI_IDS.termStructure, KPI_IDS.gammaWalls, KPI_IDS.oiConcentration],
  },
  weekend: {
    id: "weekend",
    name: "Weekend Vol",
    short: "weekend",
    primaryKpis: [KPI_IDS.atmIv, KPI_IDS.termStructure, KPI_IDS.funding],
    actions: {
      overlayKey: "weekendOverlay", // any non-empty key enables the "Open Overlay" item
      // no scanKey, no settingsKey for now
    },
  },
  parity: {
    id: "parity",
    name: "Parity Edge",
    short: "Mispricing",
    primaryKpis: [KPI_IDS.ivRv, KPI_IDS.atmIv, KPI_IDS.termStructure],
  },
  box: {
    id: "box",
    name: "Box Financing",
    short: "Rates",
    primaryKpis: [KPI_IDS.spread], // bid–ask spread %, etc.
  },
};
