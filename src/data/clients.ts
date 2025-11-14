// src/data/clients.ts

// src/data/clients.ts

export type ClientId =
  | "client-alpha"
  | "client-bravo"
  | "client-charlie"
  | "client-delta";

type ThresholdRange = {
  min?: number; // e.g. PnL must be >= min
  max?: number; // e.g. |delta| must be <= max
};

export type ClientPortfolioSnapshot = {
  // All dummy values for now – replace with live risk later
  pnlPct: number; // PnL % of NAV
  delta: number;  // portfolio delta (normalized, e.g. 1.0 = 100% underlying)
  gamma: number;  // gamma (normalized)
  vega: number;   // vega (per 1 vol pt, base currency)
  theta: number;  // theta (per day, base currency)
};

export interface ClientPortfolioConfig {
  id: ClientId;

  /** KPI id used in KPI_GROUPS so we can match card <-> client */
  kpiId: string;

  name: string;
  baseCurrency: "USD" | "EUR" | "BTC";
  notes?: string;

  snapshot: ClientPortfolioSnapshot;

  thresholds: {
    pnlPct: ThresholdRange;   // e.g. alert if below -5%
    deltaAbs: ThresholdRange; // |Δ| ≤ max
    gammaAbs: ThresholdRange; // |Γ| ≤ max
    vegaAbs: ThresholdRange;  // |V| ≤ max
    thetaAbs: ThresholdRange; // |Θ| ≤ max
  };
}

export const CLIENT_PORTFOLIOS: ClientPortfolioConfig[] = [
  {
    id: "client-alpha",
    kpiId: "portfolio-client-alpha",
    name: "Client Alpha (BTC Vol Fund)",
    baseCurrency: "USD",
    snapshot: {
      pnlPct: 2.3,      // +2.3% PnL
      delta: 0.18,      // +0.18 “underlying equivalents”
      gamma: 0.0055,
      vega: -6500,      // short vega
      theta: 2200,      // collecting theta per day
    },
    thresholds: {
      pnlPct: { min: -5 },   // don’t like worse than -5% PnL
      deltaAbs: { max: 0.30 },
      gammaAbs: { max: 0.020 },
      vegaAbs: { max: 10000 },
      thetaAbs: { max: 5000 },
    },
  },
  {
    id: "client-bravo",
    kpiId: "portfolio-client-bravo",
    name: "Client Bravo (Market-Neutral)",
    baseCurrency: "EUR",
    snapshot: {
      pnlPct: -0.9,     // slightly down
      delta: -0.04,
      gamma: 0.0018,
      vega: 3200,
      theta: 750,
    },
    thresholds: {
      pnlPct: { min: -3 },   // tighter PnL tolerance
      deltaAbs: { max: 0.10 },
      gammaAbs: { max: 0.010 },
      vegaAbs: { max: 6000 },
      thetaAbs: { max: 2500 },
    },
  },
  {
    id: "client-charlie",
    kpiId: "portfolio-client-charlie",
    name: "Client Charlie (ETH Structured Notes)",
    baseCurrency: "USD",
    snapshot: {
      pnlPct: 3.8,
      delta: 0.36,
      gamma: 0.0065,
      vega: -9800,
      theta: 4300,
    },
    thresholds: {
      pnlPct: { min: -4 },
      deltaAbs: { max: 0.35 },   // slightly looser delta
      gammaAbs: { max: 0.025 },
      vegaAbs: { max: 13000 },
      thetaAbs: { max: 5500 },
    },
  },
  {
    id: "client-delta",
    kpiId: "portfolio-client-delta",
    name: "Client Delta (BTC/ETH Multi-Strategy)",
    baseCurrency: "BTC",
    snapshot: {
      pnlPct: 0.4,
      delta: -0.22,
      gamma: 0.0023,
      vega: 1800,
      theta: 1050,
    },
    thresholds: {
      pnlPct: { min: -6 },
      deltaAbs: { max: 0.40 },
      gammaAbs: { max: 0.030 },
      vegaAbs: { max: 12000 },
      thetaAbs: { max: 4500 },
    },
  },
];
