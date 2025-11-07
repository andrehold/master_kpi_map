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
        { id: "gamma-walls", name: "Gamma “walls” near strikes", strategies: ["0DTE Overwrite", "Parity Edge"], valueType: "price" },
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
  