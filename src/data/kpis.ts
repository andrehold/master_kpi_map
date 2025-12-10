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
      "Definition: The percentile rank of current implied volatility relative to the past 1y distribution.",
      "Why it matters: Helps you judge whether vol is cheap or expensive vs its own history.",
      "How to read: High IVR suggests expensive vol (potentially better for selling); low IVR suggests cheap vol (potentially better for buying).",
      "Caveats: Regime shifts, structural changes, and skew/term effects can make historical ranks less informative.",
    ],
    bullets: [
      "Use with: Term structure, skew, realized vol, RV/IV spread.",
      "Note: IVR measures level, not skew or term; check those separately.",
    ],
  },
  [KPI_IDS.gammaWalls]: {
    title: "Gamma “walls” near strikes",
    paragraphs: [
      "Definition: Concentrations of option gamma at specific strikes, typically where dealers are short gamma.",
      "Why it matters: Large gamma levels can act as “walls” that pin price or accelerate moves when breached.",
      "How to read: Strong walls near spot can mean pinning; breaks through major walls can increase volatility.",
      "Caveats: OI-based approximations are noisy and can be overwhelmed by large directional flows.",
    ],
    bullets: [
      "Trading implications: Consider where your short strikes sit relative to dominant gamma nodes.",
      "Combine with: Delta & Gamma near shorts, funding/basis, OI concentration %, and liquidity/depth.",
    ],
  },
  [KPI_IDS.gammaCenterOfMass]: {
    title: "Gamma Center of Mass (Γ-COM)",
    paragraphs: [
      "Definition: A single 'center-of-mass' strike computed from the full options gamma surface (within a DTE bucket), weighted by gamma × open interest (and optionally by time-to-expiry).",
      "Why it matters: Shows where the options market is structurally 'heaviest' in gamma space—above, below, or right on top of spot.",
      "How to read: Positive % means the gamma COM sits above spot (upside structure heavier); negative % means below spot; near 0% means gamma is centered around spot, implying strong pin/support–resistance in the current area.",
      "High gravity (e.g. 70%+) = most gamma mass is near spot → strong structural heaviness here. Low gravity (e.g. <30%) = gamma is scattered → no strong structural anchor.",
    ],
    bullets: [
      "Typical usage: spotting pin-risk zones and asymmetric structural risk above/below spot.",
      "Combine with: Strike map, gamma walls, OI concentration, and funding/basis for a full positioning read.",
    ],
  },
  // ... keep the rest of your KPI_INFO entries as they were
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

// Build a quick lookup map from the static groups
const KPI_DEFS_BY_ID: Partial<Record<KpiId, KPIDef>> = {};
for (const group of KPI_GROUPS) {
  for (const def of group.kpis) {
    KPI_DEFS_BY_ID[def.id] = def;
  }
}

export function getKpiDef(id: KpiId): KPIDef | undefined {
  return KPI_DEFS_BY_ID[id];
}