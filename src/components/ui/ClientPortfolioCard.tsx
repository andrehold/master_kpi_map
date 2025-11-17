import KpiCard from "./KpiCard";
import type { KPIDef } from "../../data/kpis";
import { CLIENT_PORTFOLIOS } from "../../data/clients";

interface ClientPortfolioCardProps {
  kpi: KPIDef;
  locale?: string;
}

type Row = {
  key: string;
  label: string;
  actual: string;
  threshold: string;
  ok: boolean;
};

export default function ClientPortfolioCard({ kpi, locale }: ClientPortfolioCardProps) {
  const client = CLIENT_PORTFOLIOS.find((c) => c.kpiId === kpi.id);

  // Fallback if we somehow don't have config for this KPI id
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
  const rows: Row[] = [];

  // PnL row (min threshold)
  const pnlMin = thresholds.pnlPct.min;
  const pnlOk = pnlMin == null || pnlPct >= pnlMin;
  if (!pnlOk) breaches.push("PnL");

  rows.push({
    key: "pnl",
    label: "PnL (% NAV)",
    actual: `${pnlPct.toFixed(2)}%`,
    threshold: pnlMin != null ? `${pnlMin.toFixed(2)}%` : "—",
    ok: pnlOk,
  });

  // Delta row (abs <= max)
  const deltaMax = thresholds.deltaAbs.max;
  const deltaAbs = Math.abs(delta);
  const deltaOk = deltaMax == null || deltaAbs <= deltaMax;
  if (!deltaOk) breaches.push("Δ");

  rows.push({
    key: "delta",
    label: "Delta",
    actual: deltaAbs.toFixed(2),
    // e.g. "0.45 / 0.60"
    threshold: deltaMax != null ? deltaMax.toFixed(2) : "—",
    ok: deltaOk,
  });

  // Gamma row (abs <= max)
  const gammaMax = thresholds.gammaAbs.max;
  const gammaAbs = Math.abs(gamma);
  const gammaOk = gammaMax == null || gammaAbs <= gammaMax;
  if (!gammaOk) breaches.push("Γ");

  rows.push({
    key: "gamma",
    label: "Gamma",
    actual: gammaAbs.toFixed(4),
    threshold: gammaMax != null ? gammaMax.toFixed(4) : "—",
    ok: gammaOk,
  });

  // Vega row (abs <= max)
  const vegaMax = thresholds.vegaAbs.max;
  const vegaAbs = Math.abs(vega);
  const vegaOk = vegaMax == null || vegaAbs <= vegaMax;
  if (!vegaOk) breaches.push("V");

  rows.push({
    key: "vega",
    label: "Vega",
    actual: vegaAbs.toFixed(0),
    threshold: vegaMax != null ? vegaMax.toFixed(0) : "—",
    ok: vegaOk,
  });

  // Theta row (abs <= max)
  const thetaMax = thresholds.thetaAbs.max;
  const thetaAbs = Math.abs(theta);
  const thetaOk = thetaMax == null || thetaAbs <= thetaMax;
  if (!thetaOk) breaches.push("Θ");

  rows.push({
    key: "theta",
    label: "Theta",
    actual: thetaAbs.toFixed(0),
    threshold: thetaMax != null ? thetaMax.toFixed(0) : "—",
    ok: thetaOk,
  });

  const health =
    breaches.length === 0 ? "Within limits" : `Breach: ${breaches.join(", ")}`;

  const value = (
    <div className="flex flex-col gap-1 text-xs sm:text-sm">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between gap-3"
        >
          <span className="text-[var(--fg-muted)]">{row.label}</span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{row.actual}</span>
            <span className="tabular-nums text-[var(--fg-muted)]">
              / {row.threshold}
            </span>
            <span
              className={[
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border",
                row.ok
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/40 bg-red-500/10 text-red-400",
              ].join(" ")}
              aria-label={row.ok ? "Within limit" : "Limit breached"}
            >
              {row.ok ? "OK" : "Breach"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const meta = client.baseCurrency
    ? `Base: ${client.baseCurrency}${client.notes ? ` • ${client.notes}` : ""}`
    : client.notes;

  return (
    <KpiCard
      kpi={kpi}
      value={value}
      meta={meta}
      extraBadge={health}
      locale={locale}
    />
  );
}
