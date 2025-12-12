import { KPI_IDS, type KpiId } from "../kpi/kpiIds";

export type { KpiId };

export type KpiMeta = {
  id: KpiId;
  title: string;
  valueType?: KPIValueType;
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
  kpis: KpiId[];
}

export const KPIS: KpiMeta[] = [
  { id: KPI_IDS.ivr, title: "IV Rank (1y)", valueType: "percent" },
  { id: KPI_IDS.atmIv, title: "ATM IV", valueType: "percent" },
  { id: KPI_IDS.termStructure, title: "Term Structure" },
  { id: KPI_IDS.skew, title: "25Δ Risk Reversal" },
  { id: KPI_IDS.volOfVol, title: "Vol of Vol" },
  { id: KPI_IDS.ivRv, title: "IV – RV Spread" },
  { id: KPI_IDS.emHitRate, title: "EM Hit Rate (90d)", valueType: "percent" },
  { id: KPI_IDS.rvEm, title: "RV ÷ EM", valueType: "ratio" },
  { id: KPI_IDS.vix, title: "VIX", valueType: "index" },
  { id: KPI_IDS.vvix, title: "VVIX", valueType: "index" },
  { id: KPI_IDS.funding, title: "Funding Rate (ann.)", valueType: "percent" },
  { id: KPI_IDS.eventWindow, title: "Macro Event Window" },
  { id: KPI_IDS.spread, title: "Bid–Ask Spread %", valueType: "percent" },
  { id: KPI_IDS.tobDepth, title: "TOB Depth" },
  { id: KPI_IDS.liquidityStress, title: "Liquidity Stress (spreads/depth)", valueType: "percent" },
  { id: KPI_IDS.oiConcentration, title: "OI Concentration %", valueType: "percent" },
  { id: KPI_IDS.condorCreditEm, title: "Condor Credit % of EM", valueType: "percent" },
  { id: KPI_IDS.maxlossCredit, title: "Max Loss ÷ Credit", valueType: "ratio" },
  { id: KPI_IDS.pnlVsCredit, title: "PnL vs Credit %", valueType: "percent" },
  { id: KPI_IDS.deltaExposure, title: "Delta Exposure % NAV", valueType: "percent" },
  { id: KPI_IDS.gammaCenterOfMass, title: "Gamma Center of Mass (Γ-COM)", valueType: "percent" },
  { id: KPI_IDS.gammaTheta, title: "Gamma ÷ Theta", valueType: "ratio" },
  { id: KPI_IDS.fillRatio, title: "Fill Ratio %", valueType: "percent" },
  { id: KPI_IDS.arrivalSlippage, title: "Arrival Slippage" },
  { id: KPI_IDS.breakage, title: "Breakage Rate %", valueType: "percent" },
  { id: KPI_IDS.capitalUtil, title: "Capital Util % NAV", valueType: "percent" },
  { id: KPI_IDS.edgeCapture, title: "Edge Capture %", valueType: "percent" },
  { id: KPI_IDS.drawdown, title: "Drawdown % NAV", valueType: "percent" },
  { id: KPI_IDS.boxSpread, title: "Box Financing Spread (bps)" },
  { id: KPI_IDS.boxSlippage, title: "Box Slippage (ticks)" },
  { id: KPI_IDS.basis, title: "Spot–Perp Basis (ann. %)", valueType: "percent" },
  { id: KPI_IDS.tsKink, title: "Term Structure Kink (abs)" },
  { id: KPI_IDS.strikeMap, title: "Strike support / resistance" },
  { id: KPI_IDS.spotVsSma, title: "Spot vs SMAs" },
  { id: KPI_IDS.rv, title: "Realized Volatility (RV)", valueType: "percent" },
  { id: KPI_IDS.ivRvSpread, title: "IV–RV Spread", valueType: "percent" },
  { id: KPI_IDS.timeToFirstBreach, title: "Time to First Breach %", valueType: "percent" },
  { id: KPI_IDS.rvEmFactor, title: "RV ÷ EM factor", valueType: "ratio" },
  { id: KPI_IDS.shortHorizonAtr, title: "Short-horizon ATR / EM", valueType: "ratio" },
  { id: KPI_IDS.emRibbon, title: "EM regime ribbon", valueType: "text" },
  { id: KPI_IDS.vixVvix, title: "VIX/VVIX levels & jumps", valueType: "index" },
  { id: KPI_IDS.crossAssetVol, title: "Cross-asset vol benchmark (MOVE/Credit)", valueType: "index" },
  { id: KPI_IDS.impliedCorr, title: "Equity correlation (implied index)", valueType: "percent" },
  { id: KPI_IDS.macroEvents, title: "Macro risk events (Fed/ECB…)", valueType: "text" },
  { id: KPI_IDS.eventCollapse, title: "Event premium collapse", valueType: "percent" },
  { id: KPI_IDS.orderbookHealth, title: "Order book slope / stress", valueType: "percent" },
  { id: KPI_IDS.gammaWalls, title: "Gamma “walls” near strikes", valueType: "price" },
  { id: KPI_IDS.condorCredit, title: "Condor Credit % of EM", valueType: "percent" },
  { id: KPI_IDS.maxlossCredit, title: "Max Loss ÷ Expected Credit Ratio", valueType: "ratio" },
  { id: KPI_IDS.pnlVsPremium, title: "Position PnL vs Premium Paid", valueType: "percent" },
  { id: KPI_IDS.deltaGammaNearShorts, title: "Delta & Gamma near short strikes", valueType: "price" },
  { id: KPI_IDS.portfolioVegaTheta, title: "Portfolio Vega & Theta balance", valueType: "price" },
  { id: KPI_IDS.reversionHalfLife, title: "Reversion half-life (spread/parity dev)", valueType: "price" },
  { id: KPI_IDS.edgeZ, title: "Edge z-score", valueType: "sigma" },
  { id: KPI_IDS.boxFinancingSpread, title: "Box financing spread (impl – CoC)", valueType: "bps" },
  { id: KPI_IDS.exDivEarlyEx, title: "Ex-dividend / early exercise risk", valueType: "percent" },
  { id: KPI_IDS.makerTaker, title: "Maker / taker rates & rebates", valueType: "percent" },
  { id: KPI_IDS.slippage, title: "Arrival price slippage (bps)", valueType: "bps" },
  { id: KPI_IDS.leggingRisk, title: "Legging risk realized", valueType: "percent" },
  { id: KPI_IDS.timeToFill, title: "Time-to-fill & reprices", valueType: "ms" },
  { id: KPI_IDS.feesSpread, title: "Total fees & effective spread (bps)", valueType: "bps" },
  { id: KPI_IDS.infraErrors, title: "Infra costs & error rate", valueType: "percent" },
  { id: KPI_IDS.maxDdCalmar, title: "Max drawdown / Calmar", valueType: "ratio" },
  { id: KPI_IDS.lockedVsRealized, title: "Locked-in vs realized edge", valueType: "percent" },
  { id: KPI_IDS.stressTests, title: "Stress test scenarios", valueType: "text" },
  { id: KPI_IDS.capitalUtilization, title: "Capital utilization vs targets", valueType: "percent" },
  { id: KPI_IDS.concentrationLimits, title: "Concentration vs limits", valueType: "percent" },
  { id: KPI_IDS.utilizationVsCaps, title: "Utilization vs risk caps", valueType: "percent" },
  { id: KPI_IDS.latency, title: "Latency & queue priority", valueType: "ms" },
  { id: KPI_IDS.dataFreshness, title: "Data freshness", valueType: "ms" },
  { id: KPI_IDS.uptime, title: "System uptime / incident rate", valueType: "percent" },
  { id: KPI_IDS.portfolioClientAlpha, title: "Client Alpha", valueType: "text" },
  { id: KPI_IDS.portfolioClientBravo, title: "Client Bravo", valueType: "text" },
  { id: KPI_IDS.portfolioClientCharlie, title: "Client Charlie", valueType: "text" },
  { id: KPI_IDS.portfolioClientDelta, title: "Client Delta", valueType: "text" },
];

const KPI_META_BY_ID: Partial<Record<KpiId, KpiMeta>> = KPIS.reduce(
  (acc, meta) => {
    acc[meta.id] = meta;
    return acc;
  },
  {} as Partial<Record<KpiId, KpiMeta>>
);

export function getKpiMeta(id: KpiId): KpiMeta | undefined {
  return KPI_META_BY_ID[id];
}

export function getKpiTitle(id: KpiId): string {
  return KPI_META_BY_ID[id]?.title ?? String(id);
}

export function getKpiValueType(id: KpiId): KPIValueType {
  return KPI_META_BY_ID[id]?.valueType ?? "custom";
}

export const KPI_GROUPS: KPIGroup[] = [
  {
    id: "vol-skew",
    title: "1. Volatility & Skew Metrics",
    kpis: [
      KPI_IDS.atmIv,
      KPI_IDS.ivr,
      KPI_IDS.termStructure,
      KPI_IDS.skew25dRr,
      KPI_IDS.volOfVol,
      KPI_IDS.tsKink,
    ],
  },
  {
    id: "rv-vs-iv",
    title: "2. Realized vs Implied (RV vs IV)",
    kpis: [
      KPI_IDS.rv,
      KPI_IDS.ivRvSpread,
      KPI_IDS.emHitRate,
      KPI_IDS.timeToFirstBreach,
      KPI_IDS.rvEmFactor,
      KPI_IDS.shortHorizonAtr,
      KPI_IDS.emRibbon,
    ],
  },
  {
    id: "regime-macro",
    title: "3. Market Regime & Macro Filters",
    kpis: [
      KPI_IDS.vixVvix,
      KPI_IDS.vix,
      KPI_IDS.crossAssetVol,
      KPI_IDS.impliedCorr,
      KPI_IDS.macroEvents,
      KPI_IDS.eventCollapse,
    ],
  },
  {
    id: "micro-flow",
    title: "4. Microstructure, Flows & Liquidity",
    kpis: [
      KPI_IDS.funding,
      KPI_IDS.basis,
      KPI_IDS.oiConcentration,
      KPI_IDS.gammaWalls,
      KPI_IDS.liquidityStress,
      KPI_IDS.orderbookHealth,
    ],
  },
  {
    id: "strategy-health",
    title: "5. Strategy-Specific Health Metrics",
    kpis: [
      KPI_IDS.condorCreditEm,
      KPI_IDS.maxlossCredit,
      KPI_IDS.deltaGammaNearShorts,
      KPI_IDS.portfolioVegaTheta,
      KPI_IDS.pnlVsPremium,
      KPI_IDS.reversionHalfLife,
      KPI_IDS.edgeZ,
      KPI_IDS.boxFinancingSpread,
      KPI_IDS.exDivEarlyEx,
    ],
  },
  {
    id: "execution-costs",
    title: "6. Execution & Cost KPIs",
    kpis: [
      KPI_IDS.fillRatio,
      KPI_IDS.makerTaker,
      KPI_IDS.slippage,
      KPI_IDS.leggingRisk,
      KPI_IDS.timeToFill,
      KPI_IDS.breakage,
      KPI_IDS.feesSpread,
      KPI_IDS.infraErrors,
    ],
  },
  {
    id: "risk-pnl",
    title: "7. Risk, Capital & P&L",
    kpis: [
      KPI_IDS.maxDdCalmar,
      KPI_IDS.lockedVsRealized,
      KPI_IDS.stressTests,
      KPI_IDS.capitalUtilization,
      KPI_IDS.concentrationLimits,
      KPI_IDS.utilizationVsCaps,
    ],
  },
  {
    id: "ops-process",
    title: "8. Operational & Process Health",
    kpis: [
      KPI_IDS.latency,
      KPI_IDS.dataFreshness,
      KPI_IDS.uptime,
    ],
  },
  {
    id: "strikes-positioning",
    title: "9. Strikes & Positioning",
    kpis: [
      KPI_IDS.strikeMap,
      KPI_IDS.gammaCenterOfMass,
      KPI_IDS.spotVsSma,
    ],
  },
  {
    id: "client-portfolios",
    title: "10. Client Portfolios",
    kpis: [
      KPI_IDS.portfolioClientAlpha,
      KPI_IDS.portfolioClientBravo,
      KPI_IDS.portfolioClientCharlie,
      KPI_IDS.portfolioClientDelta,
    ],
  },
];

export const ALL_KPIS: KpiId[] = KPI_GROUPS.flatMap((g) => g.kpis);

// ---- KPI Info (drawer "Info" tab) ----------------------------------------

export type KpiInfoDoc = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const KPI_INFO: Partial<Record<KpiId, KpiInfoDoc>> = {
  [KPI_IDS.ivr]: {
    title: "IV Rank (1y)",
    paragraphs: [
      "Definition: The percentile rank of current at-the-money implied volatility relative to its own 1-year history.",
      "Why it matters: IV Rank helps you quickly see whether options are rich or cheap versus the asset’s recent volatility regime rather than on an absolute scale.",
      "How to read: High IVR (e.g. 70–100) suggests rich implied vol and may favor premium-selling strategies; low IVR (e.g. 0–30) suggests cheap vol and may favor premium-buying or hedging.",
      "Caveats: Regime shifts, structural changes, and big one-off events can distort the 1-year lookback and make raw ranks less informative.",
    ],
    bullets: [
      "Typical usage: Entry filter for short-vol or long-vol strategies.",
      "Combine with: Term structure, skew, realized volatility, and IV–RV spreads for a full volatility context.",
    ],
  },

  [KPI_IDS.atmIv]: {
    title: "ATM IV",
    paragraphs: [
      "Definition: The implied volatility for at-the-money options at the reference tenor (e.g. ~30D or strategy-specific).",
      "Why it matters: ATM IV is the anchor for the entire volatility surface and feeds directly into expected move, pricing, and risk metrics.",
      "How to read: Rising ATM IV usually reflects growing uncertainty or demand for options; falling IV suggests more complacency or reduced demand for protection.",
    ],
    bullets: [
      "Typical usage: Core input to expected move, risk-defined structures, and vol regime detection.",
      "Combine with: IV Rank, term structure, skew, and realized volatility.",
    ],
  },

  [KPI_IDS.termStructure]: {
    title: "Term Structure",
    paragraphs: [
      "Definition: The shape of implied volatility across expiries (short to long tenors).",
      "Why it matters: Contango, backwardation, and kinks in the curve reveal where markets are pricing concentrated event risk or structural carry opportunities.",
      "How to read: Upward sloping (contango) often reflects normal time value and risk premia; inverted or kinked curves can signal stress, near-term events, or dislocations.",
    ],
    bullets: [
      "Typical usage: Choosing tenors for premium selling, hedges, and calendar structures.",
      "Combine with: ATM IV, IV Rank, event window, and RV vs EM metrics.",
    ],
  },

  [KPI_IDS.skew]: {
    title: "25Δ Risk Reversal",
    paragraphs: [
      "Definition: The implied volatility difference between 25Δ OTM calls and puts (call IV minus put IV).",
      "Why it matters: Skew shows whether downside or upside protection is more in demand and reflects positioning, tail hedging, and structural flows.",
      "How to read: Negative skew (puts richer than calls) is typical in risk assets; unusually steep or flat skew can flag dislocations or crowding.",
    ],
    bullets: [
      "Typical usage: Selecting strikes for risk-defined spreads and understanding tail pricing.",
      "Combine with: ATM IV, gamma walls, strike map, and realized distribution (RV).",
    ],
  },

  [KPI_IDS.volOfVol]: {
    title: "Vol of Vol",
    paragraphs: [
      "Definition: The variability of implied volatility itself, often measured via realized moves in IV or vol-of-vol indices.",
      "Why it matters: High vol-of-vol makes options pricing less stable, increases the risk of mark-to-market swings, and affects timing of entries/exits.",
      "How to read: Elevated vol-of-vol suggests that IV levels are unstable and can move sharply; low vol-of-vol is more supportive for carry and mean-reversion structures.",
    ],
    bullets: [
      "Typical usage: Sizing and timing of volatility trades and hedges.",
      "Combine with: ATM IV, IV Rank, RV, and event premium collapse metrics.",
    ],
  },

  [KPI_IDS.ivRv]: {
    title: "IV – RV Spread",
    paragraphs: [
      "Definition: The difference between implied volatility and realized volatility over the chosen horizon.",
      "Why it matters: The IV–RV spread is a core measure of option richness; persistent positive spreads underpin short-vol carry, while negative spreads signal underpriced realized risk.",
      "How to read: Large positive spread suggests implied vol is rich versus realized; negative or compressed spreads warn that short-vol carry may be fragile.",
    ],
    bullets: [
      "Typical usage: Validating whether to sell or buy volatility and evaluating carry risk.",
      "Combine with: RV, ATM IV, IV Rank, RV ÷ EM factor, and EM hit rate.",
    ],
  },

  [KPI_IDS.emHitRate]: {
    title: "EM Hit Rate (90d)",
    paragraphs: [
      "Definition: The percentage of days over the last 90 trading days where realized moves reached or exceeded the prior expected move.",
      "Why it matters: EM hit rate tells you whether the market has systematically under- or over-estimated realized moves in recent history.",
      "How to read: High hit rates indicate that expected move bands are frequently breached (underpriced realized risk); low hit rates suggest realized moves are comfortably contained (potentially overpriced implied risk).",
    ],
    bullets: [
      "Typical usage: Sanity check for EM-based risk-defined strategies.",
      "Combine with: RV ÷ EM factor, short-horizon ATR/EM, and RV vs IV spreads.",
    ],
  },

  [KPI_IDS.rvEm]: {
    title: "RV ÷ EM",
    paragraphs: [
      "Definition: The ratio of realized volatility to the volatility implied by the expected move.",
      "Why it matters: RV ÷ EM quickly shows whether realized volatility has been running hot or cold relative to implied expectations.",
      "How to read: Ratios above 1 mean realized moves have exceeded implied expectations; ratios well below 1 suggest realized has stayed inside the implied move.",
    ],
    bullets: [
      "Typical usage: Backtesting EM robustness and sizing guardrails.",
      "Combine with: EM hit rate, RV ÷ EM factor, and short-horizon ATR/EM.",
    ],
  },

  [KPI_IDS.vix]: {
    title: "VIX",
    paragraphs: [
      "Definition: The CBOE Volatility Index, a model-free measure of 30-day implied volatility on the S&P 500.",
      "Why it matters: VIX is a global risk barometer; moves in VIX spill over into crypto, rates, and cross-asset risk appetite.",
      "How to read: Elevated VIX typically signals stress or heightened macro uncertainty; depressed VIX is associated with calmer markets and richer carry.",
    ],
    bullets: [
      "Typical usage: Macro volatility backdrop for crypto and cross-asset strategies.",
      "Combine with: VVIX, VIX/VVIX ratio, cross-asset vol benchmarks, and macro event window.",
    ],
  },

  [KPI_IDS.vvix]: {
    title: "VVIX",
    paragraphs: [
      "Definition: An index of implied volatility on VIX options—effectively vol-of-vol for the S&P 500.",
      "Why it matters: VVIX reflects demand for VIX options and extreme tail protection; spikes can lead moves in VIX and broader risk assets.",
      "How to read: High VVIX with moderate VIX often precedes larger volatility moves; low VVIX suggests limited demand for tail hedges.",
    ],
    bullets: [
      "Typical usage: Early warning for volatility regime shifts.",
      "Combine with: VIX, VIX/VVIX metric, and cross-asset vol measures.",
    ],
  },

  [KPI_IDS.funding]: {
    title: "Funding Rate (ann.)",
    paragraphs: [
      "Definition: The annualized funding rate on perpetual swaps for the underlying asset.",
      "Why it matters: Funding conveys directional positioning and basis; persistent positive or negative funding reflects structural long/short imbalances.",
      "How to read: Strongly positive funding suggests aggressive long perp positioning; negative funding suggests short bias or hedge demand.",
    ],
    bullets: [
      "Typical usage: Positioning sentiment gauge and input into basis trades.",
      "Combine with: Spot–perp basis, OI concentration, gamma positioning, and macro risk tone.",
    ],
  },

  [KPI_IDS.eventWindow]: {
    title: "Macro Event Window",
    paragraphs: [
      "Definition: A qualitative/quantitative indicator for proximity to major macro events (e.g. Fed/ECB decisions, CPI, payrolls, regulatory catalysts).",
      "Why it matters: Event clustering drives term structure shape, risk premia, and realized gap risk.",
      "How to read: Tight event windows with known catalysts justify elevated front-end IV and more cautious short-dated short-vol exposure.",
    ],
    bullets: [
      "Typical usage: Adjusting tenor, size, and hedges around known macro risk.",
      "Combine with: Term structure, VIX/VVIX, cross-asset vol, and event premium collapse.",
    ],
  },

  [KPI_IDS.spread]: {
    title: "Bid–Ask Spread %",
    paragraphs: [
      "Definition: The width of the bid–ask spread expressed as a percentage of mid-price.",
      "Why it matters: Wide spreads increase trading costs, worsen slippage, and reduce the reliability of backtests and theoretical edge.",
      "How to read: Persistent wide spreads indicate poor liquidity; compressed spreads support more active trading and tighter risk control.",
    ],
    bullets: [
      "Typical usage: Assessing tradeability and appropriate size per instrument/tenor.",
      "Combine with: TOB depth, liquidity stress, fill ratio, and slippage metrics.",
    ],
  },

  [KPI_IDS.tobDepth]: {
    title: "TOB Depth",
    paragraphs: [
      "Definition: Visible top-of-book depth (size available at best bid and ask, optionally aggregated across levels).",
      "Why it matters: Depth determines how much size you can execute without materially moving the market or paying extra spread.",
      "How to read: Thin depth increases market impact and legging risk; deeper books support larger orders and tighter execution constraints.",
    ],
    bullets: [
      "Typical usage: Sizing control and venue selection; monitoring market quality over time.",
      "Combine with: Bid–ask spread %, order book slope/stress, fill ratio, and time-to-fill.",
    ],
  },

  [KPI_IDS.liquidityStress]: {
    title: "Liquidity Stress (spreads/depth)",
    paragraphs: [
      "Definition: Composite indicator of market liquidity derived from spreads, depth, and order book behavior.",
      "Why it matters: Stressed liquidity environments amplify execution risk, slippage, and gap risk, especially for multi-leg options structures.",
      "How to read: Rising stress metrics call for reduced size, simpler structures, or wider execution bands.",
    ],
    bullets: [
      "Typical usage: Regime flag for when to de-risk or adjust execution tactics.",
      "Combine with: Spread, TOB depth, order book health, and infra/latency metrics.",
    ],
  },

  [KPI_IDS.oiConcentration]: {
    title: "OI Concentration %",
    paragraphs: [
      "Definition: The share of total open interest concentrated in the largest strikes, expiries, or clusters.",
      "Why it matters: Concentrated OI can drive pinning, gamma walls, and forced flows around key strikes or dates.",
      "How to read: High concentration around specific strikes increases the odds of pin-risk behavior and exaggerated moves when levels break.",
    ],
    bullets: [
      "Typical usage: Identifying crowded strikes/expiries for risk-defined structures.",
      "Combine with: Gamma walls, gamma COM, strike map, and funding/basis signals.",
    ],
  },

  [KPI_IDS.condorCreditEm]: {
    title: "Condor Credit % of EM",
    paragraphs: [
      "Definition: The net credit received for a reference iron condor expressed as a percentage of the expected move.",
      "Why it matters: This links premium yield directly to the underlying’s implied volatility, making condor payoffs comparable across regimes.",
      "How to read: Higher credits vs EM indicate richer compensation for taking range risk; very low credits suggest limited reward for the same EM-based risk.",
    ],
    bullets: [
      "Typical usage: Screening and ranking condor opportunities by regime-adjusted yield.",
      "Combine with: Max loss ÷ expected credit, RV ÷ EM factor, EM hit rate, and short-horizon ATR/EM.",
    ],
  },

  [KPI_IDS.maxlossCredit]: {
    title: "Max Loss ÷ Expected Credit Ratio",
    paragraphs: [
      "Definition: The ratio of worst-case loss on a risk-defined structure to its expected or target credit.",
      "Why it matters: This is a simple leverage and asymmetry check; high ratios mean poor risk-reward even if headline credit looks attractive.",
      "How to read: Lower ratios imply better convexity (less max loss per unit of expected credit); high ratios warrant smaller size or avoidance.",
    ],
    bullets: [
      "Typical usage: Pre-trade filter for spreads, condors, and other risk-defined structures.",
      "Combine with: Condor credit % of EM, PnL vs credit %, and drawdown/Calmar metrics.",
    ],
  },

  [KPI_IDS.pnlVsCredit]: {
    title: "PnL vs Credit %",
    paragraphs: [
      "Definition: Realized or mark-to-market PnL on a structure expressed as a percentage of the initial credit received.",
      "Why it matters: Normalizing by credit makes it easy to compare outcomes across trades and regimes.",
      "How to read: Strong positive percentages show efficient capture of credit; deep negative values indicate adverse moves relative to initial premium.",
    ],
    bullets: [
      "Typical usage: Post-trade analytics and hit-rate diagnostics for short-premium strategies.",
      "Combine with: EM hit rate, RV ÷ EM factor, and locked-in vs realized edge.",
    ],
  },

  [KPI_IDS.deltaExposure]: {
    title: "Delta Exposure % NAV",
    paragraphs: [
      "Definition: Net portfolio delta scaled by portfolio NAV.",
      "Why it matters: Delta exposure quantifies directional risk; even ‘vol-only’ strategies can accumulate sizeable delta via gamma and skew.",
      "How to read: Persistent high positive or negative delta indicates structural directionality that should be intentional and risk-managed.",
    ],
    bullets: [
      "Typical usage: Portfolio-level hedge sizing and risk budgeting.",
      "Combine with: Gamma/Theta balance, delta & gamma near short strikes, and basis/funding.",
    ],
  },

  [KPI_IDS.gammaCenterOfMass]: {
    title: "Gamma Center of Mass (Γ-COM)",
    paragraphs: [
      "Definition: A single “center-of-mass” strike computed from the distribution of option gamma, usually weighted by gamma × open interest and time-to-expiry.",
      "Why it matters: Γ-COM highlights where the options market is structurally heaviest in gamma space relative to spot.",
      "How to read: A positive percentage distance means Γ-COM sits above spot; a negative value means it sits below. The closer COM is to spot, the stronger the pinning potential around current levels.",
      "Gravity share helps interpret how dominant the local gamma cluster is versus the rest of the surface—high values indicate strong structural influence.",
    ],
    bullets: [
      "Typical usage: Identifying pin-risk zones and structural support/resistance from options positioning.",
      "Combine with: Gamma walls, strike map, OI concentration, and funding/basis.",
    ],
  },

  [KPI_IDS.gammaTheta]: {
    title: "Gamma ÷ Theta",
    paragraphs: [
      "Definition: Ratio of portfolio gamma exposure to daily theta (time decay), typically in normalized units.",
      "Why it matters: This ratio reflects how much convexity you are buying per unit of carry cost.",
      "How to read: Higher ratios indicate more convex payoff per unit decay; low ratios mean you are paying carry without much gamma benefit.",
    ],
    bullets: [
      "Typical usage: Comparing long-vol structures and tuning hedge efficiency.",
      "Combine with: Delta exposure, portfolio Vega/Theta, vol-of-vol, and realized volatility.",
    ],
  },

  [KPI_IDS.fillRatio]: {
    title: "Fill Ratio %",
    paragraphs: [
      "Definition: The percentage of submitted orders that execute at or better than the intended limit, within defined timing and price bands.",
      "Why it matters: Low fill ratios waste signals and degrade realized edge even if signal quality is good.",
      "How to read: Persistent low fill ratios indicate overly aggressive limits, poor venue selection, or stressed liquidity.",
    ],
    bullets: [
      "Typical usage: Evaluating execution quality and tuning quoting/limit logic.",
      "Combine with: Time-to-fill, spread, TOB depth, slippage, and order book health.",
    ],
  },

  [KPI_IDS.arrivalSlippage]: {
    title: "Arrival Slippage",
    paragraphs: [
      "Definition: Price difference between decision/arrival price and actual execution price, expressed in ticks, bps, or implied vol terms.",
      "Why it matters: Slippage directly erodes theoretical edge and can turn marginal trades into negative EV.",
      "How to read: Consistently high slippage indicates timing, sizing, or execution logic issues.",
    ],
    bullets: [
      "Typical usage: Monitoring execution quality versus model marks or reference quotes.",
      "Combine with: Spread, TOB depth, time-to-fill, and total fees & effective spread.",
    ],
  },

  [KPI_IDS.breakage]: {
    title: "Breakage Rate %",
    paragraphs: [
      "Definition: The percentage of planned trades or structures that fail to complete as intended (partial fills, missing legs, cancelled opportunities).",
      "Why it matters: High breakage reduces realized edge and introduces unintended risk (e.g. unhedged legs).",
      "How to read: Rising breakage rates call for simplifying structures, improving routing, or widening execution tolerances.",
    ],
    bullets: [
      "Typical usage: Evaluating robustness of execution workflows and multi-leg strategies.",
      "Combine with: Legging risk, time-to-fill, fill ratio, and infra error rates.",
    ],
  },

  [KPI_IDS.capitalUtil]: {
    title: "Capital Util % NAV",
    paragraphs: [
      "Definition: Portion of NAV encumbered by margin, collateral, or capital usage for the specific strategy or book.",
      "Why it matters: Capital efficiency is central to realized risk-adjusted returns and scaling capacity.",
      "How to read: High utilization can be efficient if risk is controlled; persistent maxed-out utilization can signal hidden concentration or liquidity risk.",
    ],
    bullets: [
      "Typical usage: Position sizing, leverage control, and margin optimization.",
      "Combine with: Capital utilization vs targets, utilization vs risk caps, and concentration vs limits.",
    ],
  },

  [KPI_IDS.edgeCapture]: {
    title: "Edge Capture %",
    paragraphs: [
      "Definition: Realized edge captured versus theoretical model edge, usually aggregated over a set of trades.",
      "Why it matters: It shows how much of the modelled advantage survives after execution costs, slippage, and filtering.",
      "How to read: Edge capture close to 100% means execution and filters preserve signal quality; low capture signals either model overfit or implementation issues.",
    ],
    bullets: [
      "Typical usage: Validating models and execution machinery end-to-end.",
      "Combine with: Arrival slippage, fill ratio, fees & spread, and locked-in vs realized edge.",
    ],
  },

  [KPI_IDS.drawdown]: {
    title: "Drawdown % NAV",
    paragraphs: [
      "Definition: Peak-to-trough decline in portfolio NAV over the selected horizon.",
      "Why it matters: Drawdown is the most intuitive risk metric for investors and risk committees.",
      "How to read: Compare current drawdown to historical drawdown distribution for the strategy and to the mandate’s risk tolerance.",
    ],
    bullets: [
      "Typical usage: Risk oversight, leverage adjustment, and strategy kill-switches.",
      "Combine with: Max drawdown / Calmar, capital utilization, and stress test scenarios.",
    ],
  },

  [KPI_IDS.boxSpread]: {
    title: "Box Financing Spread (bps)",
    paragraphs: [
      "Definition: Implied financing rate embedded in option box spreads, expressed in basis points versus theoretical fair funding.",
      "Why it matters: Deviations signal opportunities or inefficiencies in implied funding relative to cash or repo markets.",
      "How to read: Positive spreads above cost-of-capital indicate potential carry opportunities; negative spreads warn that boxes are overpriced or reflect counterparty/operational risk.",
    ],
    bullets: [
      "Typical usage: Relative value financing trades and sanity checks for broker funding.",
      "Combine with: Box financing spread (impl – CoC), basis, and funding rates.",
    ],
  },

  [KPI_IDS.boxSlippage]: {
    title: "Box Slippage (ticks)",
    paragraphs: [
      "Definition: Execution slippage on box spreads measured in ticks versus theoretical mid or fair value.",
      "Why it matters: Even small tick slippage can erase slim financing arbitrage edges.",
      "How to read: Rising slippage indicates inadequate liquidity or overly ambitious pricing.",
    ],
    bullets: [
      "Typical usage: Validating feasibility of box-based financing and arb strategies.",
      "Combine with: Box financing spread, spread/TOB depth, and fees & effective spread.",
    ],
  },

  [KPI_IDS.basis]: {
    title: "Spot–Perp Basis (ann. %)",
    paragraphs: [
      "Definition: Annualized difference between spot price and perpetual swap price.",
      "Why it matters: Basis captures the cost of carry and positioning imbalances between spot and derivatives.",
      "How to read: Positive basis reflects stronger demand for leveraged long perps; negative basis signals short bias or lack of long leverage demand.",
    ],
    bullets: [
      "Typical usage: Basis trades, carry assessment, and reading directional sentiment.",
      "Combine with: Funding rate, OI concentration, gamma positioning, and macro events.",
    ],
  },

  [KPI_IDS.tsKink]: {
    title: "Term Structure Kink (abs)",
    paragraphs: [
      "Definition: Magnitude of the largest local deviation in the volatility term structure (e.g. a hump or dip around a specific tenor).",
      "Why it matters: Kinks often correspond to concentrated event risk or mispriced segments in the curve.",
      "How to read: Large kinks invite relative value trades between neighboring tenors; flat curves suggest more uniform risk pricing.",
    ],
    bullets: [
      "Typical usage: Calendar spreads, diagonal structures, and event-risk positioning.",
      "Combine with: Term structure, macro event window, and event premium collapse.",
    ],
  },

  [KPI_IDS.strikeMap]: {
    title: "Strike support / resistance",
    paragraphs: [
      "Definition: Map of strikes with notable open interest, gamma, and historical reaction levels.",
      "Why it matters: Options markets often reinforce technical levels via hedging flows and pin risk.",
      "How to read: Dense clusters near spot indicate likely pin zones; isolated large strikes above or below can act as magnets or accelerators when breached.",
    ],
    bullets: [
      "Typical usage: Selecting short strikes and understanding structural support/resistance zones.",
      "Combine with: Gamma walls, gamma COM, OI concentration, and delta/gamma near shorts.",
    ],
  },

  [KPI_IDS.spotVsSma]: {
    title: "Spot vs SMAs",
    paragraphs: [
      "Definition: Relative distance of spot price to selected simple moving averages (e.g. 20D, 50D, 100D, 200D).",
      "Why it matters: Trend and mean-reversion regimes influence the distribution of returns and the behavior of volatility.",
      "How to read: Persistent distance above long SMAs indicates strong uptrends; repeated rejections or failures around SMAs flag regime shifts.",
    ],
    bullets: [
      "Typical usage: Contextualizing directional risk and mean-reversion expectations.",
      "Combine with: EM ribbon, RV, term structure, and basis/funding.",
    ],
  },

  [KPI_IDS.rv]: {
    title: "Realized Volatility (RV)",
    paragraphs: [
      "Definition: Annualized volatility of realized returns over the chosen lookback window.",
      "Why it matters: RV is the ground truth against which implied volatility and expected moves are judged.",
      "How to read: Compare RV to IV, IV Rank, and EM-derived volatility to understand whether the market has been over- or underestimating risk.",
    ],
    bullets: [
      "Typical usage: Sanity check for implied levels and EM-based sizing.",
      "Combine with: IV–RV spread, IV Rank, RV ÷ EM, and RV ÷ EM factor.",
    ],
  },

  [KPI_IDS.ivRvSpread]: {
    title: "IV–RV Spread",
    paragraphs: [
      "Definition: Difference between implied volatility and realized volatility expressed in vol points or percent.",
      "Why it matters: It is the most direct gauge of volatility risk premia and carry for option sellers/buyers.",
      "How to read: Persistently positive spreads support premium-selling strategies; negative or volatile spreads call for caution.",
    ],
    bullets: [
      "Typical usage: Vol carry evaluation and regime classification.",
      "Combine with: RV, ATM IV, EM hit rate, and RV ÷ EM factor.",
    ],
  },

  [KPI_IDS.timeToFirstBreach]: {
    title: "Time to First Breach %",
    paragraphs: [
      "Definition: Average fraction of the option’s life that passes before the underlying first touches the expected move boundary.",
      "Why it matters: This shows whether EM boundaries are typically breached early, late, or rarely within the option lifespan.",
      "How to read: Short times to first breach signal more path volatility and earlier stress on short-premium structures.",
    ],
    bullets: [
      "Typical usage: Designing stop-loss and roll rules around EM-based structures.",
      "Combine with: EM hit rate, RV ÷ EM, and short-horizon ATR/EM.",
    ],
  },

  [KPI_IDS.rvEmFactor]: {
    title: "RV ÷ EM factor",
    paragraphs: [
      "Definition: Ratio comparing realized volatility to the volatility implied by the EM-based option structure design.",
      "Why it matters: It refines RV ÷ EM by focusing on the exact EM calibration used in the strategy.",
      "How to read: Factors significantly above 1 highlight environments where realized risk routinely exceeds EM assumptions.",
    ],
    bullets: [
      "Typical usage: Post-trade validation of EM calibration and parameter tuning.",
      "Combine with: EM hit rate, RV ÷ EM, and realized drawdown statistics.",
    ],
  },

  [KPI_IDS.shortHorizonAtr]: {
    title: "Short-horizon ATR / EM",
    paragraphs: [
      "Definition: Ratio of short-horizon average true range (ATR) to the expected move for the same or longer horizon.",
      "Why it matters: High ATR/EM ratios flag choppy, noisy markets where day-to-day moves consume EM quickly.",
      "How to read: Elevated ratios suggest tighter risk controls or wider EM bands; low ratios support slower-moving, carry-friendly regimes.",
    ],
    bullets: [
      "Typical usage: Adjusting micro-hedging, stop distances, and intraday risk limits.",
      "Combine with: EM hit rate, RV ÷ EM, term structure, and vol-of-vol.",
    ],
  },

  [KPI_IDS.emRibbon]: {
    title: "EM regime ribbon",
    paragraphs: [
      "Definition: Regime classification of the expected-move environment (e.g. compressed, normal, elevated, stressed) aggregated over time.",
      "Why it matters: A simple visual regime map helps align strategy templates and sizing with the underlying volatility environment.",
      "How to read: Prolonged ‘elevated’ or ‘stressed’ regimes call for more conservative sizing and potentially different structures than ‘compressed’ regimes.",
    ],
    bullets: [
      "Typical usage: High-level regime dashboard for strategy selection.",
      "Combine with: IV Rank, RV metrics, EM hit rate, and macro event windows.",
    ],
  },

  [KPI_IDS.vixVvix]: {
    title: "VIX/VVIX levels & jumps",
    paragraphs: [
      "Definition: Combined view of VIX level and VVIX (vol-of-vol) dynamics.",
      "Why it matters: Together, they highlight both current equity volatility and the market’s appetite for tail hedges on volatility itself.",
      "How to read: Rising VVIX with modest VIX can precede volatility spikes; both high indicates active stress, while both low reflects a calm carry regime.",
    ],
    bullets: [
      "Typical usage: Macro risk overlay for crypto and vol strategies.",
      "Combine with: Cross-asset vol benchmarks, implied correlation, and macro events.",
    ],
  },

  [KPI_IDS.crossAssetVol]: {
    title: "Cross-asset vol benchmark (MOVE/Credit)",
    paragraphs: [
      "Definition: Reference volatility indicators from rates, credit, or other asset classes (e.g. MOVE index, credit spreads).",
      "Why it matters: Cross-asset vol can lead or confirm volatility regimes in the underlying you trade.",
      "How to read: Divergences between crypto vol and cross-asset vol can flag relative value or lagging re-pricings.",
    ],
    bullets: [
      "Typical usage: Macro context and cross-asset risk alignment.",
      "Combine with: VIX/VVIX, implied correlation, and macro event windows.",
    ],
  },

  [KPI_IDS.impliedCorr]: {
    title: "Equity correlation (implied index)",
    paragraphs: [
      "Definition: Market-implied correlation between constituents of a major equity index.",
      "Why it matters: It indicates whether risk is perceived as idiosyncratic or systematic, which influences tail behavior and contagion risks.",
      "How to read: High implied correlation suggests systemic risk scenarios; low correlation suggests more idiosyncratic dispersion.",
    ],
    bullets: [
      "Typical usage: Macro tail-risk assessment and cross-asset hedging context.",
      "Combine with: VIX, credit spreads, cross-asset vol benchmarks, and macro events.",
    ],
  },

  [KPI_IDS.macroEvents]: {
    title: "Macro risk events (Fed/ECB…)",
    paragraphs: [
      "Definition: A curated list or indicator of upcoming macro and policy events relevant for risk assets.",
      "Why it matters: These events often drive volatility spikes, regime changes, and re-pricing of risk premia.",
      "How to read: Denser event clusters imply higher near-term risk; sparse calendars support carry and mean-reversion trades.",
    ],
    bullets: [
      "Typical usage: Forward planning of risk, hedging, and exposure rotation.",
      "Combine with: Term structure, event window, and event premium collapse metrics.",
    ],
  },

  [KPI_IDS.eventCollapse]: {
    title: "Event premium collapse",
    paragraphs: [
      "Definition: Change in implied volatility or event premium before and after a known event.",
      "Why it matters: Post-event vol collapse is a key driver of PnL for short volatility positions established into the event.",
      "How to read: Large collapses post-event show how much premium was purely event-related; muted collapses may signal lingering uncertainty.",
    ],
    bullets: [
      "Typical usage: Structuring trades around known catalysts and measuring realized edge.",
      "Combine with: Term structure, IV Rank, and macro event windows.",
    ],
  },

  [KPI_IDS.orderbookHealth]: {
    title: "Order book slope / stress",
    paragraphs: [
      "Definition: Metrics summarizing order book shape, such as depth decay with price, imbalance, and gap risk.",
      "Why it matters: Order book structure determines practical liquidity and the risk of adverse price jumps during execution.",
      "How to read: Steep slopes, large gaps, or imbalances indicate stress and increased execution risk.",
    ],
    bullets: [
      "Typical usage: Execution-risk gating and venue/routing decisions.",
      "Combine with: Spread, TOB depth, liquidity stress, and time-to-fill.",
    ],
  },

  [KPI_IDS.gammaWalls]: {
    title: "Gamma “walls” near strikes",
    paragraphs: [
      "Definition: Clusters of high option gamma at specific strikes, typically where dealers are short gamma.",
      "Why it matters: Large gamma concentrations can pin spot around those levels or accelerate moves when they break.",
      "How to read: Strong walls near spot imply pin-risk and potential magnet levels; breaks through major walls can trigger hedging flows and volatility spikes.",
    ],
    bullets: [
      "Typical usage: Locating structural support/resistance and pin zones for strike selection.",
      "Combine with: Gamma COM, strike map, OI concentration, and delta/gamma near shorts.",
    ],
  },

  [KPI_IDS.condorCredit]: {
    title: "Condor Credit % of EM",
    paragraphs: [
      "Definition: Net credit for a specific tradeable condor structure expressed as a percentage of the expected move for the chosen tenor.",
      "Why it matters: It makes condor payoffs directly comparable across time and regimes by normalizing to EM.",
      "How to read: Higher percentages indicate richer compensation for taking EM-sized range risk; extremely low values may not justify the margin, tail risk, or complexity.",
    ],
    bullets: [
      "Typical usage: Trade-level selection and ranking of condor setups.",
      "Combine with: Max loss ÷ expected credit ratio, EM hit rate, and realized drawdown metrics.",
    ],
  },

  [KPI_IDS.pnlVsPremium]: {
    title: "Position PnL vs Premium Paid",
    paragraphs: [
      "Definition: PnL on a long-premium position expressed as a percentage of initial premium spent.",
      "Why it matters: Normalizing by premium highlights how efficiently hedges or long-vol bets are working.",
      "How to read: Sustained negative values flag expensive hedging or poorly timed long-vol bets; strong positive values reflect efficient convexity usage.",
    ],
    bullets: [
      "Typical usage: Evaluating long-vol hedges and tactical option buys.",
      "Combine with: Gamma/Theta ratio, vol-of-vol, and event premium dynamics.",
    ],
  },

  [KPI_IDS.deltaGammaNearShorts]: {
    title: "Delta & Gamma near short strikes",
    paragraphs: [
      "Definition: Local delta and gamma exposure concentrated around the portfolio’s short strikes.",
      "Why it matters: This area is where risk is most sensitive to spot moves, gaps, and re-hedging behavior.",
      "How to read: High local gamma near shorts means rapid PnL swings when spot approaches those strikes; large local delta indicates directional risk concentrated near option barriers.",
    ],
    bullets: [
      "Typical usage: Monitoring risk hot-spots around short strikes for spreads and condors.",
      "Combine with: Gamma walls, strike map, and portfolio Vega/Theta balance.",
    ],
  },

  [KPI_IDS.portfolioVegaTheta]: {
    title: "Portfolio Vega & Theta balance",
    paragraphs: [
      "Definition: Combined view of portfolio vega exposure and daily theta decay.",
      "Why it matters: Together they describe your net sensitivity to volatility moves versus carry cost.",
      "How to read: Large long vega with heavy theta cost implies a bet on higher volatility; short vega with positive theta reflects carry-focused positioning.",
    ],
    bullets: [
      "Typical usage: Portfolio construction and hedge overlay design.",
      "Combine with: Gamma/Theta, ATM IV, vol-of-vol, and VIX/cross-asset vol.",
    ],
  },

  [KPI_IDS.reversionHalfLife]: {
    title: "Reversion half-life (spread/parity dev)",
    paragraphs: [
      "Definition: Estimated time it takes for a mispricing (e.g. spread or parity deviation) to decay by half on average.",
      "Why it matters: Half-life shapes realistic holding periods and position sizing in relative value trades.",
      "How to read: Short half-lives support more frequent, smaller RV trades; long half-lives call for patient capital and tighter risk controls.",
    ],
    bullets: [
      "Typical usage: Sizing and horizon planning for relative value and parity-arb strategies.",
      "Combine with: Edge z-score, box financing spread, and liquidity stress.",
    ],
  },

  [KPI_IDS.edgeZ]: {
    title: "Edge z-score",
    paragraphs: [
      "Definition: Statistical z-score of current edge versus its historical distribution.",
      "Why it matters: Z-scores help distinguish normal noise from genuinely exceptional opportunities.",
      "How to read: Higher absolute z-scores indicate rarer opportunities; but extreme values require careful sanity checking for data and structural shifts.",
    ],
    bullets: [
      "Typical usage: Opportunity ranking and thresholding for systematic trades.",
      "Combine with: Reversion half-life, slippage, and realized edge capture.",
    ],
  },

  [KPI_IDS.boxFinancingSpread]: {
    title: "Box financing spread (impl – CoC)",
    paragraphs: [
      "Definition: Difference between implied financing from box spreads and your cost of capital, in basis points.",
      "Why it matters: Positive spreads indicate that box financing is attractive relative to internal or external funding costs.",
      "How to read: Large positive spreads suggest capacity for box-based financing; negative spreads imply no edge after costs.",
    ],
    bullets: [
      "Typical usage: Funding optimization and arb evaluation.",
      "Combine with: Box spread level, infra/operational constraints, and capital utilization.",
    ],
  },

  [KPI_IDS.exDivEarlyEx]: {
    title: "Ex-dividend / early exercise risk",
    paragraphs: [
      "Definition: Qualitative/quantitative assessment of early exercise and ex-dividend risk for options with carry components.",
      "Why it matters: Poorly managed early exercise can eat into option value and distort hedges.",
      "How to read: High risk scenarios warrant more conservative strike/tenor choices or explicit early-exercise monitoring.",
    ],
    bullets: [
      "Typical usage: Equity/index options management where dividends and borrow matter.",
      "Combine with: Box/parity metrics, funding/basis, and borrow/fees data.",
    ],
  },

  [KPI_IDS.makerTaker]: {
    title: "Maker / taker rates & rebates",
    paragraphs: [
      "Definition: Effective fee schedule summarizing maker rebates and taker fees across venues.",
      "Why it matters: Fee structure shapes execution behavior and optimal routing between passive and aggressive orders.",
      "How to read: High taker fees and low rebates favor more passive execution; generous maker rebates can materially improve net edge if fill quality holds.",
    ],
    bullets: [
      "Typical usage: Execution strategy design and venue prioritization.",
      "Combine with: Fill ratio, slippage, time-to-fill, and fees & effective spread.",
    ],
  },

  [KPI_IDS.slippage]: {
    title: "Arrival price slippage (bps)",
    paragraphs: [
      "Definition: Difference between decision price and execution price, expressed in basis points.",
      "Why it matters: Slippage is a direct drag on realized returns and can overwhelm small statistical edges.",
      "How to read: Persistent high slippage indicates the need to adjust order timing, size, or routing.",
    ],
    bullets: [
      "Typical usage: Ongoing execution monitoring and model realism checks.",
      "Combine with: Spread, TOB depth, time-to-fill, and infra/latency metrics.",
    ],
  },

  [KPI_IDS.leggingRisk]: {
    title: "Legging risk realized",
    paragraphs: [
      "Definition: Realized PnL impact from executing multi-leg structures leg-by-leg rather than all-at-once or with protection.",
      "Why it matters: Legging risk can turn attractive theoretical structures into poor realized trades if markets move in between legs.",
      "How to read: Rising realized legging losses argue for better execution tools (RFQ, complex orders) or simpler trade structures.",
    ],
    bullets: [
      "Typical usage: Evaluating complexity versus execution robustness in multi-leg options trading.",
      "Combine with: Breakage rate, time-to-fill, spread/liquidity metrics, and infra/latency.",
    ],
  },

  [KPI_IDS.timeToFill]: {
    title: "Time-to-fill & reprices",
    paragraphs: [
      "Definition: Time from order submission to fill, and frequency of reprices required to achieve execution.",
      "Why it matters: Longer times and multiple reprices increase signaling risk and slippage, especially in fast markets.",
      "How to read: Short, stable times-to-fill with few reprices indicate healthy liquidity; long and variable times indicate stressed or thin markets.",
    ],
    bullets: [
      "Typical usage: Execution health monitoring and venue/routing decisions.",
      "Combine with: Spread, TOB depth, fill ratio, and order book health.",
    ],
  },

  [KPI_IDS.feesSpread]: {
    title: "Total fees & effective spread (bps)",
    paragraphs: [
      "Definition: All-in transaction costs including explicit fees and implicit spread/slippage, expressed in basis points.",
      "Why it matters: Total cost determines how much of theoretical edge is actually realizable.",
      "How to read: If effective costs approach or exceed average edge, strategy sustainability is at risk.",
    ],
    bullets: [
      "Typical usage: Strategy viability assessment and routing/fee negotiation.",
      "Combine with: Slippage, maker/taker structure, and edge capture metrics.",
    ],
  },

  [KPI_IDS.infraErrors]: {
    title: "Infra costs & error rate",
    paragraphs: [
      "Definition: Frequency and impact of infrastructure issues (timeouts, rejects, disconnects) and their cost.",
      "Why it matters: Operational reliability is core risk; errors can produce unintended exposures and PnL swings.",
      "How to read: Elevated error rates require root-cause analysis and may justify throttling size or complexity until resolved.",
    ],
    bullets: [
      "Typical usage: Operational risk monitoring and incident post-mortems.",
      "Combine with: Latency, uptime, breakage rate, and stress-test outcomes.",
    ],
  },

  [KPI_IDS.maxDdCalmar]: {
    title: "Max drawdown / Calmar",
    paragraphs: [
      "Definition: Ratio of annualized return to maximum drawdown (Calmar) or related drawdown-efficiency metric.",
      "Why it matters: It blends return with pain experienced, aligning closer to investor perception of risk than volatility alone.",
      "How to read: Higher ratios mean more return per unit of drawdown; low ratios flag strategies with poor risk-payoff profiles.",
    ],
    bullets: [
      "Typical usage: Strategy comparison, mandate sizing, and capital allocation.",
      "Combine with: Raw drawdown %, Sharpe-like metrics, and stress test results.",
    ],
  },

  [KPI_IDS.lockedVsRealized]: {
    title: "Locked-in vs realized edge",
    paragraphs: [
      "Definition: Comparison of edge locked in at trade inception (e.g. structural edge, spread capture) to edge actually realized after exits.",
      "Why it matters: It highlights how much of ex-ante edge is given back through poor exits, execution, or regime shifts.",
      "How to read: Large gaps between locked-in and realized edge point to implementation or risk management leaks.",
    ],
    bullets: [
      "Typical usage: Post-trade analysis and process improvement.",
      "Combine with: Edge capture %, slippage, breakage, and stop/roll rules.",
    ],
  },

  [KPI_IDS.stressTests]: {
    title: "Stress test scenarios",
    paragraphs: [
      "Definition: Modeled PnL and risk under predefined stress scenarios (gaps, vol spikes, correlation shocks, liquidity squeezes).",
      "Why it matters: Stress tests reveal tail risks not visible in day-to-day volatility metrics.",
      "How to read: Focus on scenario consistency with current regime and whether projected losses fit within risk appetite and liquidity constraints.",
    ],
    bullets: [
      "Typical usage: Governance, investor reporting, and limits calibration.",
      "Combine with: Drawdown history, capital utilization vs caps, and macro risk indicators.",
    ],
  },

  [KPI_IDS.capitalUtilization]: {
    title: "Capital utilization vs targets",
    paragraphs: [
      "Definition: Comparison of actual capital usage to planned or target utilization for the strategy or book.",
      "Why it matters: Under-utilization means un-deployed capacity; over-utilization can signal creeping risk and concentration.",
      "How to read: Persistent deviations from targets should trigger a review of pipeline, risk appetite, or constraints.",
    ],
    bullets: [
      "Typical usage: Capacity management and planning.",
      "Combine with: Utilization vs risk caps, concentration vs limits, and drawdown metrics.",
    ],
  },

  [KPI_IDS.concentrationLimits]: {
    title: "Concentration vs limits",
    paragraphs: [
      "Definition: Degree of concentration in names, expiries, strikes, or factors relative to predefined limits.",
      "Why it matters: Concentrated risk can dominate portfolio outcomes and breach mandate constraints.",
      "How to read: Metrics near or above limits call for de-risking, diversification, or explicit escalation.",
    ],
    bullets: [
      "Typical usage: Limit monitoring for books, strategies, and clients.",
      "Combine with: Capital utilization, utilization vs caps, and OI concentration.",
    ],
  },

  [KPI_IDS.utilizationVsCaps]: {
    title: "Utilization vs risk caps",
    paragraphs: [
      "Definition: How close the strategy is to hard risk, VAR, or exposure caps.",
      "Why it matters: Running close to caps reduces flexibility and increases the risk of forced de-risking into bad liquidity.",
      "How to read: Persistent high utilization vs caps should be intentional and justified; otherwise, reduce risk.",
    ],
    bullets: [
      "Typical usage: High-level governance and escalation triggers.",
      "Combine with: Concentration vs limits, drawdown metrics, and stress tests.",
    ],
  },

  [KPI_IDS.latency]: {
    title: "Latency & queue priority",
    paragraphs: [
      "Definition: End-to-end latency from decision to exchange acknowledgment, plus effective priority in the order book queue.",
      "Why it matters: In competitive markets, latency directly affects fill probability, slippage, and edge capture.",
      "How to read: Higher latency or poor queue positioning demands more conservative assumptions about fill quality.",
    ],
    bullets: [
      "Typical usage: Infrastructure tuning and venue choice for latency-sensitive flows.",
      "Combine with: Fill ratio, time-to-fill, infra error rates, and slippage.",
    ],
  },

  [KPI_IDS.dataFreshness]: {
    title: "Data freshness",
    paragraphs: [
      "Definition: Staleness of market and reference data feeds used for decisions and risk.",
      "Why it matters: Stale data breaks assumptions behind models and risk metrics, especially during fast markets.",
      "How to read: Data age should stay within tight, predefined bounds; any persistent drift warrants immediate investigation.",
    ],
    bullets: [
      "Typical usage: Monitoring data pipeline health and model validity.",
      "Combine with: Latency, infra error metrics, and stress-test procedures.",
    ],
  },

  [KPI_IDS.uptime]: {
    title: "System uptime / incident rate",
    paragraphs: [
      "Definition: Percentage uptime of critical systems and frequency of impactful incidents.",
      "Why it matters: Downtime during volatile periods can be extremely costly and undermine strategy reliability.",
      "How to read: Uptime should be consistently high; incidents should trend down over time with clear remediation.",
    ],
    bullets: [
      "Typical usage: Operational risk oversight and SLA monitoring.",
      "Combine with: Infra error rates, stress tests, and incident post-mortems.",
    ],
  },

  [KPI_IDS.portfolioClientAlpha]: {
    title: "Client Alpha",
    paragraphs: [
      "Definition: Summary KPI view tailored to client Alpha’s objectives (e.g. risk, return, exposure).",
      "Why it matters: Different clients care about different slices of the KPI stack; this aggregates what is most relevant for Alpha.",
      "How to read: Interpret in the context of mutually agreed benchmarks, mandates, and reporting conventions.",
    ],
    bullets: [
      "Typical usage: Client-specific reporting, review decks, and mandate tracking.",
      "Combine with: Global KPIs plus client-specific constraints and targets.",
    ],
  },

  [KPI_IDS.portfolioClientBravo]: {
    title: "Client Bravo",
    paragraphs: [
      "Definition: Summary KPI view tailored to client Bravo’s risk/return and mandate profile.",
      "Why it matters: Provides a client-centric slice of the overall risk and performance picture.",
      "How to read: Use alongside agreed KPIs and thresholds for that client’s strategy sleeve.",
    ],
    bullets: [
      "Typical usage: Investor communication and oversight for client Bravo.",
      "Combine with: Strategy-level KPIs and concentration/utilization metrics.",
    ],
  },

  [KPI_IDS.portfolioClientCharlie]: {
    title: "Client Charlie",
    paragraphs: [
      "Definition: Aggregated metrics and commentary customized for client Charlie’s portfolio.",
      "Why it matters: Maintains alignment between day-to-day trading activity and Charlie’s objectives and constraints.",
      "How to read: Focus on trends and deviations versus Charlie-specific benchmarks rather than raw levels.",
    ],
    bullets: [
      "Typical usage: Reporting and governance for client Charlie mandates.",
      "Combine with: Global KPI dashboard and client documentation.",
    ],
  },

  [KPI_IDS.portfolioClientDelta]: {
    title: "Client Delta",
    paragraphs: [
      "Definition: Client-specific KPI slice for Delta, aggregating the subset of metrics that matter for that mandate.",
      "Why it matters: Avoids overloading stakeholders with irrelevant globals and keeps focus on mandate-relevant signals.",
      "How to read: Interpret relative to Delta’s risk guidelines and performance objectives.",
    ],
    bullets: [
      "Typical usage: Dedicated reporting, IC packs, and quarterly reviews.",
      "Combine with: House-level risk metrics and stress-test results.",
    ],
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
  | "horizon" // EM-based defined-risk entry
  | "carry" // Funding/basis carry
  | "odte" // 0DTE overwrite
  | "range" // Range-bound premium harvest
  | "weekend" // Weekend vol
  | "parity" // Parity edge
  | "box"; // Box financing

export type StrategyMeta = {
  id: StrategyKey;
  name: string; // display name (menu)
  short?: string; // brief tag/variant for the menu
  description?: string[]; // optional longer text (drawer/help)
  primaryKpis: KpiId[]; // most relevant KPIs for this strategy
  secondaryKpis?: KpiId[]; // nice-to-have KPIs
  // UI integration hints — use string keys so we avoid function imports here
  actions?: {
    overlayKey?: string; // string key your UI can route on (any non-empty value enables overlay)
    scanKey?: "horizonScan";
    settingsKey?: "horizonSettings";
    overlayLabel?: string;
    scanLabel?: string;
  };
  defaults?: {
    currency?: string;
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
      KPI_IDS.skew, // 25Δ RR
      KPI_IDS.condorCreditEm,
      KPI_IDS.maxlossCredit,
      KPI_IDS.pnlVsCredit,
      KPI_IDS.deltaExposure,
      KPI_IDS.gammaTheta,
    ],
    secondaryKpis: [
      KPI_IDS.spread,
      KPI_IDS.tobDepth,
      KPI_IDS.liquidityStress,
      KPI_IDS.oiConcentration,
      KPI_IDS.funding,
      KPI_IDS.vix,
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
      minCreditUsd: 200,
      maxBaFrac: 0.25,
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

const STRATEGY_KEY_TO_LABEL: Record<StrategyKey, Strategy> = {
  horizon: "Expected Move",
  range: "Range-Bound Premium",
  carry: "Carry Trade",
  odte: "0DTE Overwrite",
  weekend: "Weekend Vol",
  parity: "Parity Edge",
  box: "Box Financing",
};

function buildKpiStrategyMap(): Record<KpiId, Strategy[]> {
  const map: Record<KpiId, Strategy[]> = {} as any;

  (Object.keys(STRATEGY_CATALOG) as StrategyKey[]).forEach((key) => {
    const meta = STRATEGY_CATALOG[key];
    const label = STRATEGY_KEY_TO_LABEL[key];
    if (!meta || !label) return;

    const allKpis: KpiId[] = [
      ...(meta.primaryKpis ?? []),
      ...(meta.secondaryKpis ?? []),
    ];

    allKpis.forEach((kpiId) => {
      const arr = (map[kpiId] ??= []);
      if (!arr.includes(label)) {
        arr.push(label);
      }
    });
  });

  return map;
}

const KPI_STRATEGIES: Record<KpiId, Strategy[]> = buildKpiStrategyMap();

export function getKpiStrategies(id: KpiId): Strategy[] {
  return KPI_STRATEGIES[id] ?? [];
}

export function makeKpiDef(
  id: KpiId,
  overrides?: Partial<Pick<KPIDef, "name" | "description" | "strategies" | "valueType">>
): KPIDef {
  const meta = getKpiMeta(id);
  const name = overrides?.name ?? meta?.title ?? String(id);
  const valueType = overrides?.valueType ?? meta?.valueType ?? "custom";
  const strategies = overrides?.strategies ?? getKpiStrategies(id);
  const infoDoc = KPI_INFO[id];
  const description = overrides?.description ?? infoDoc?.title;

  return {
    id,
    name,
    description,
    strategies,
    valueType,
  };
}