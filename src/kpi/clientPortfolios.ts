// src/kpi/clientPortfolios.ts
import { CLIENT_PORTFOLIOS } from "../data/clients";

export type ClientPortfolioRow = {
  id: string;
  metric: string;
  actual: string;
  threshold: string;
  ok: boolean;
};

export type ClientPortfolioModel = {
  pnlPct: number;
  baseCurrency?: string;
  notes?: string;
  health: string;
  rows: ClientPortfolioRow[];
};

/**
 * Build a normalized model for a client portfolio KPI card:
 * - looks up the client by its kpiId
 * - computes abs greeks
 * - compares them to thresholds
 * - returns rows for the mini table and an overall health label
 */
export function getClientPortfolioModel(
  kpiId: string
): ClientPortfolioModel | null {
  const client = CLIENT_PORTFOLIOS.find((c) => c.kpiId === kpiId);
  if (!client) return null;

  const { snapshot, thresholds, baseCurrency, notes } = client;
  const { pnlPct, delta, gamma, vega, theta } = snapshot;

  const rows: ClientPortfolioRow[] = [];
  const breaches: string[] = [];

  // PnL row (min threshold)
  const pnlMin = thresholds.pnlPct?.min;
  const pnlOk = pnlMin == null || pnlPct >= pnlMin;
  if (!pnlOk) breaches.push("PnL");

  rows.push({
    id: "pnl",
    metric: "PnL (% NAV)",
    actual: `${pnlPct.toFixed(2)}%`,
    threshold: pnlMin != null ? `${pnlMin.toFixed(2)}%` : "—",
    ok: pnlOk,
  });

  // Delta row (abs <= max)
  const deltaMax = thresholds.deltaAbs?.max;
  const deltaAbs = Math.abs(delta);
  const deltaOk = deltaMax == null || deltaAbs <= deltaMax;
  if (!deltaOk) breaches.push("Δ");

  rows.push({
    id: "delta",
    metric: "Delta",
    actual: deltaAbs.toFixed(2),
    threshold: deltaMax != null ? deltaMax.toFixed(2) : "—",
    ok: deltaOk,
  });

  // Gamma row (abs <= max)
  const gammaMax = thresholds.gammaAbs?.max;
  const gammaAbs = Math.abs(gamma);
  const gammaOk = gammaMax == null || gammaAbs <= gammaMax;
  if (!gammaOk) breaches.push("Γ");

  rows.push({
    id: "gamma",
    metric: "Gamma",
    actual: gammaAbs.toFixed(4),
    threshold: gammaMax != null ? gammaMax.toFixed(4) : "—",
    ok: gammaOk,
  });

  // Vega row (abs <= max)
  const vegaMax = thresholds.vegaAbs?.max;
  const vegaAbs = Math.abs(vega);
  const vegaOk = vegaMax == null || vegaAbs <= vegaMax;
  if (!vegaOk) breaches.push("V");

  rows.push({
    id: "vega",
    metric: "Vega",
    actual: vegaAbs.toFixed(0),
    threshold: vegaMax != null ? vegaMax.toFixed(0) : "—",
    ok: vegaOk,
  });

  // Theta row (abs <= max)
  const thetaMax = thresholds.thetaAbs?.max;
  const thetaAbs = Math.abs(theta);
  const thetaOk = thetaMax == null || thetaAbs <= thetaMax;
  if (!thetaOk) breaches.push("Θ");

  rows.push({
    id: "theta",
    metric: "Theta",
    actual: thetaAbs.toFixed(0),
    threshold: thetaMax != null ? thetaMax.toFixed(0) : "—",
    ok: thetaOk,
  });

  const health =
    breaches.length === 0 ? "Within limits" : `Breach: ${breaches.join(", ")}`;

  return {
    pnlPct,
    baseCurrency,
    notes,
    health,
    rows,
  };
}
