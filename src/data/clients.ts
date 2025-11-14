// src/data/clients.ts

export type ClientId = "client-alpha" | "client-bravo" | "client-charlie" | "client-delta";

type ThresholdRange = {
  min?: number;  // e.g. PnL must be >= min
  max?: number;  // e.g. |delta| must be <= max
};

export type ClientPortfolioSnapshot = {
  // All dummy values for now, you can replace with live data later
  pnlPct: number;  // PnL % of NAV
  delta: number;   // portfolio delta (normalized, e.g. 1.0 = 100% underlying)
  gamma: number;   // gamma (normalized)
  vega: number;    // vega (per 1 vol pt, in base currency)
  theta: number;   // theta (per day, base currency)
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
      pnlPct: 1.8,
      delta: 0.12,
      gamma: 0.0042,
      vega: -4200,
      theta: 1350,
    },
    thresholds: {
      pnlPct: { min: -5 },
      deltaAbs: { max: 0.25 },
      gammaAbs: { max: 0.015 },
      vegaAbs: { max: 8000 },
      thetaAbs: { max: 3000 },
    },
  },
  {
    id: "client-bravo",
    kpiId: "portfolio-client-bravo",
    name: "Client Bravo (Market-Neutral)",
    baseCurrency: "EUR",
    snapshot: {
      pnlPct: -0.7,
      delta: -0.05,
      gamma: 0.0015,
      vega: 2500,
      theta: 620,
    },
    thresholds: {
      pnlPct: { min: -3 },
      deltaAbs: { max: 0.10 },
      gammaAbs: { max: 0.010 },
      vegaAbs: { max: 5000 },
      thetaAbs: { max: 2000 },
    },
  },
  {
    id: "client-charlie",
    kpiId: "portfolio-client-charlie",
    name: "Client Charlie (ETH Structured Notes)",
    baseCurrency: "USD",
    snapshot: {
      pnlPct: 3.4,
      delta: 0.35,
      gamma: 0.006,
      vega: -9000,
      theta: 4100,
    },
    thresholds: {
      pnlPct: { min: -4 },
      deltaAbs: { max: 0.30 },
      gammaAbs: { max: 0.020 },
      vegaAbs: { max: 12000 },
      thetaAbs: { max: 5000 },
    },
  },
  {
    id: "client-delta",
    kpiId: "portfolio-client-delta",
    name: "Client Delta (BTC/ETH Multi-Strategy)",
    baseCurrency: "BTC",
    snapshot: {
      pnlPct: 0.2,
      delta: -0.22,
      gamma: 0.002,
      vega: 1500,
      theta: 900,
    },
    thresholds: {
      pnlPct: { min: -6 },
      deltaAbs: { max: 0.35 },
      gammaAbs: { max: 0.020 },
      vegaAbs: { max: 10000 },
      thetaAbs: { max: 4000 },
    },
  },
];
