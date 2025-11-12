import React, { useMemo } from "react";
import KpiCard from "./KpiCard";
import type { KPIDef } from "../../data/kpis";
import { useOpenInterestConcentration, type Currency } from "../../hooks/useOpenInterestConcentration";

function fmtPercent(x?: number, digits = 1) {
  if (x == null || !isFinite(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}
function fmtNumber(x?: number) {
  if (x == null || !isFinite(x)) return "—";
  if (Math.abs(x) >= 1_000_000_000) return (x / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2) + "M";
  if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(2) + "k";
  return x.toFixed(2);
}

export default function OIConcentrationCard({
  kpi,
  currency = "BTC",
  topN = 3,
  expiry = "front",
  windowPct,
  pollMs = 60_000,
}: {
  kpi: KPIDef;
  currency?: Currency;
  topN?: number;
  expiry?: "front" | "all";
  windowPct?: number;
  pollMs?: number;
}) {
  const { loading, error, metrics } = useOpenInterestConcentration({
    currency,
    topN,
    expiry,
    windowPct,
    pollMs,
  });

  const value = useMemo(() => {
    if (loading && !metrics) return "…";
    if (error) return "—";
    return fmtPercent(metrics?.topNShare);
  }, [loading, error, metrics]);

  const meta = useMemo(() => {
    if (loading && !metrics) return "loading";
    if (error) return "error";
    if (!metrics) return "Awaiting data";
    const scope =
      metrics.expiryScope === "front"
        ? `Front expiry${metrics.frontExpiryTs ? ` · ${new Date(metrics.frontExpiryTs).toLocaleDateString()}` : ""}`
        : "All expiries";
    const s = metrics.indexPrice ? ` · S ${Math.round(metrics.indexPrice)}` : "";
    return `${scope}${s} · n=${metrics.includedCount}`;
  }, [loading, error, metrics]);

  const extraBadge = useMemo(() => {
    const win = typeof windowPct === "number" && windowPct > 0 ? ` • Window ±${Math.round(windowPct * 100)}%` : "";
    return `Top ${topN}${win}`;
  }, [topN, windowPct]);

  const footer = useMemo(() => {
    if (error) {
      return (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
          Failed to load: {String(error)}
        </div>
      );
    }
    const list = (metrics?.rankedStrikes ?? []).slice(0, 6);
    if (!list.length) {
      return <div className="text-xs text-[var(--fg-muted)]">No strikes in scope</div>;
    }
    return (
      <div className="flex items-start justify-between">
        <div className="text-xs">
          <div className="opacity-70 mb-1">Top strikes</div>
          <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
            {list.map((b) => (
              <React.Fragment key={b.strike}>
                <div className="tabular-nums">${Math.round(b.strike)}</div>
                <div className="opacity-70">
                  {fmtPercent(metrics!.totalOi > 0 ? b.oi / metrics!.totalOi : 0)}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="text-xs text-right">
          <div className="opacity-70 mb-1">Totals</div>
          <div>Total OI: <b>{fmtNumber(metrics?.totalOi)}</b> {currency}</div>
          <div>Top-1: <b>{fmtPercent(metrics?.top1Share)}</b></div>
          <div>HHI: <b>{fmtPercent(metrics?.hhi)}</b></div>
        </div>
      </div>
    );
  }, [metrics, error, currency]);

  return (
    <KpiCard
      kpi={kpi}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      footer={footer}
      // Enable guidance drawer via KpiCard’s built-in plumbing
      infoKey={kpi.id}
      guidanceValue={metrics?.topNShare != null ? metrics.topNShare * 100 : null}
    />
  );
}
