// src/components/ui/LiquidityStressCard.tsx
import React, { useMemo } from "react";
import KpiCard from "./KpiCard";
import type { KPIDef } from "../../data/kpis";
import type { Currency } from "../../services/deribit";
import { useLiquidityStress } from "../../hooks/domain/useLiquidityStress";

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

function fmtBps(x?: number, digits = 1) {
  if (x == null || !isFinite(x)) return "—";
  return `${x.toFixed(digits)} bps`;
}

export default function LiquidityStressCard({
  kpi,
  currency = "BTC",
  windowPct = 0.005, // ±0.5%
  clipSize = 10,     // 10 BTC notional clip for depth
  pollMs = 60_000,  //60_000
}: {
  kpi: KPIDef;
  currency?: Currency;
  /** Fractional window around mid, e.g. 0.005 = ±0.5% */
  windowPct?: number;
  /** Approx size (in underlying units) you care about trading, e.g. 10 BTC */
  clipSize?: number;
  /** Polling interval */
  pollMs?: number;
}) {
  const { loading, error, metrics } = useLiquidityStress({
    currency,
    windowPct,
    clipSize,
    pollMs,
  });

  // Main KPI: combined liquidity stress score (0–1)
  const value = useMemo(() => {
    if (loading && !metrics) return "…";
    if (error) return "—";
    return fmtPercent(metrics?.combinedStress);
  }, [loading, error, metrics]);

  // Meta line under the title, similar to OI concentration:
  // "Perp + 3D + 30D · S 103555 · n=3"
  const meta = useMemo(() => {
    if (loading && !metrics) return "loading";
    if (error) return "error";
    if (!metrics) return "Awaiting data";

    const labels = (metrics.markets ?? []).map((m) => m.label).join(" + ");
    const scope = labels || "—";
    const s = metrics.indexPrice ? ` · S ${Math.round(metrics.indexPrice)}` : "";
    const n = (metrics.markets ?? []).length;
    const nPart = n ? ` · n=${n}` : "";

    return `${scope}${s}${nPart}`;
  }, [loading, error, metrics]);

  // Config badge: window + clip
  const extraBadge = useMemo(() => {
    const parts: string[] = [];
    if (typeof windowPct === "number" && windowPct > 0) {
      parts.push(`Window ±${(windowPct * 100).toFixed(1)}%`);
    }
    if (typeof clipSize === "number" && clipSize > 0) {
      parts.push(`Clip ${clipSize} ${currency}`);
    }
    return parts.join(" • ");
  }, [windowPct, clipSize, currency]);

  const footer = useMemo(() => {
    if (error) {
      return (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
          Failed to load: {String(error)}
        </div>
      );
    }

    const markets = metrics?.markets ?? [];
    if (!markets.length) {
      return (
        <div className="text-xs text-[var(--fg-muted)]">
          No markets in scope
        </div>
      );
    }

    const worst =
      markets.reduce<
        (typeof markets)[number] | undefined
      >((acc, m) => {
        if (!acc) return m;
        const a = typeof acc.stress === "number" ? acc.stress : 0;
        const b = typeof m.stress === "number" ? m.stress : 0;
        return b > a ? m : acc;
      }, undefined) ?? null;

    const avgSpreadBps =
      typeof metrics?.avgSpreadBps === "number" && isFinite(metrics.avgSpreadBps)
        ? `${metrics.avgSpreadBps.toFixed(1)} bps`
        : "—";

    return (
      <div className="flex items-start justify-between">
        <div className="text-xs">
          <div className="opacity-70 mb-1">Markets</div>
          <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
            {markets.map((m) => (
              <React.Fragment key={m.id}>
                <div className="tabular-nums">{m.label}</div>
                <div className="opacity-70">
                  {fmtBps(m.spreadBps)} · {fmtNumber(m.depth)} {currency}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="text-xs text-right">
          <div className="opacity-70 mb-1">Totals</div>
          <div>
            Avg spread: <b>{avgSpreadBps}</b>
          </div>
          <div>
            Total depth: <b>{fmtNumber(metrics?.totalDepth)}</b> {currency}
          </div>
          <div>
            Worst tenor:{" "}
            <b>{worst?.label ?? "—"}</b>
            {worst && (
              <>
                {" "}
                ({fmtPercent(
                  typeof worst.stress === "number" ? worst.stress : undefined
                )})
              </>
            )}
          </div>
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
      infoKey={kpi.id}
      guidanceValue={
        metrics?.combinedStress != null ? metrics.combinedStress * 100 : null
      }
    />
  );
}
