import React from "react";
import KpiCard from "./KpiCard";
import type { KPIDef } from "../../data/kpis";
import { CLIENT_PORTFOLIOS } from "../../data/clients";

interface ClientPortfolioCardProps {
  kpi: KPIDef;
  locale?: string;
}

export default function ClientPortfolioCard({ kpi, locale }: ClientPortfolioCardProps) {
  const client = CLIENT_PORTFOLIOS.find((c) => c.kpiId === kpi.id);

  // Fallback: config missing for this KPI id
  if (!client) {
    return (
      <KpiCard
        kpi={kpi}
        value="—"
        meta="No client config found"
        extraBadge={null}
        locale={locale}
      />
    );
  }

  const { snapshot, thresholds } = client;
  const { pnlPct, delta, gamma, vega, theta } = snapshot;

  const breaches: string[] = [];

  if (thresholds.pnlPct.min != null && pnlPct < thresholds.pnlPct.min) {
    breaches.push("PnL");
  }
  if (thresholds.deltaAbs.max != null && Math.abs(delta) > thresholds.deltaAbs.max) {
    breaches.push("Δ");
  }
  if (thresholds.gammaAbs.max != null && Math.abs(gamma) > thresholds.gammaAbs.max) {
    breaches.push("Γ");
  }
  if (thresholds.vegaAbs.max != null && Math.abs(vega) > thresholds.vegaAbs.max) {
    breaches.push("V");
  }
  if (thresholds.thetaAbs.max != null && Math.abs(theta) > thresholds.thetaAbs.max) {
    breaches.push("Θ");
  }

  const health =
    breaches.length === 0 ? "Within limits" : `Breach: ${breaches.join(", ")}`;

  const value = `${pnlPct.toFixed(2)}%`; // main KPI value: PnL % of NAV

  const meta = `Δ ${delta.toFixed(2)} · Γ ${gamma.toFixed(4)} · V ${vega.toFixed(
    0
  )} · Θ ${theta.toFixed(0)}`;

  const extraBadge = `Limits: PnL ≥ ${thresholds.pnlPct.min ?? "–"}% · |Δ| ≤ ${
    thresholds.deltaAbs.max ?? "–"
  } · |Γ| ≤ ${thresholds.gammaAbs.max ?? "–"} · |V| ≤ ${
    thresholds.vegaAbs.max ?? "–"
  } · |Θ| ≤ ${thresholds.thetaAbs.max ?? "–"} • ${health}`;

  return (
    <KpiCard
      kpi={kpi}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      locale={locale}
    />
  );
}
