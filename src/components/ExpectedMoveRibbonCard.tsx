// src/components/ExpectedMoveRibbonCard.tsx
import React, { useMemo, useState } from "react";
import MetricRibbonCard from "./MetricRibbonCard";
import type { RibbonItem } from "./MetricRibbon";
import { useExpectedMove } from "../hooks/useExpectedMove";
import type { Currency } from "../services/deribit";

type Mode = "abs" | "pct";

export type ExpectedMoveRibbonCardProps = {
  currency?: Currency; // "BTC" | "ETH"
  title?: string;
  className?: string;
};

export default function ExpectedMoveRibbonCard({
  currency = "BTC",
  title = "Expected Move",
  className,
}: ExpectedMoveRibbonCardProps) {
  // Uses curated shortlist by default (per the updated hook)
  const { indexPrice, em, points, asOf, loading, error, reload } = useExpectedMove({ currency });
  const [mode, setMode] = useState<Mode>("abs");

  const items: RibbonItem[] = useMemo(() => {
    const s = typeof indexPrice === "number" && isFinite(indexPrice) && indexPrice > 0 ? indexPrice : null;

    // Pre-sort points by DTE for nearest-expiry lookup
    const pts = [...(points ?? [])].sort((a, b) => a.dteDays - b.dteDays);

    return (em ?? []).map((row) => {
      const id = `d${row.days}`;
      const label = formatHorizon(row.days);

      // Value
      let value: string | undefined;
      if (mode === "abs" && typeof row.abs === "number") {
        value = `± ${formatNumber(row.abs, 0)}`;
      } else if (mode === "pct" && typeof row.pct === "number") {
        value = `± ${(row.pct * 100).toFixed(2)}%`;
      }

      // Badge: IV at this horizon (decimal -> pct with 1dp)
      const badge = typeof row.iv === "number" ? `IV ${label} ${(row.iv * 100).toFixed(1)}%` : undefined;

      // Nearest expiry to this horizon (for transparency)
      const nearest = nearestExpiryForDays(pts, row.days);
      const sqrtT = Math.sqrt(Math.max(0, row.days) / 365);
      const footnote =
        `S × IV × √t · √t ${sqrtT.toFixed(3)}` +
        (nearest
          ? ` · Exp ${nearest.expiryLabel}`
          : "");

      return { id, label, value, badge, footnote };
    });
  }, [em, points, indexPrice, mode]);

  const headerChips = useMemo(() => {
    const chips: string[] = [];
    if (typeof indexPrice === "number" && isFinite(indexPrice)) chips.push(`Spot ${formatNumber(indexPrice)}`);
    if (asOf) chips.push(`IV TS ${new Date(asOf).toLocaleTimeString()}`);
    return chips;
  }, [indexPrice, asOf]);

  const controls = (
    <div className="inline-flex text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-900)]">
      <button
        onClick={() => setMode("abs")}
        className={[
          "px-2 py-1 rounded-l-lg",
          mode === "abs" ? "bg-[var(--surface-800)]" : "opacity-70 hover:opacity-100",
        ].join(" ")}
      >
        Abs
      </button>
      <button
        onClick={() => setMode("pct")}
        className={[
          "px-2 py-1 rounded-r-lg",
          mode === "pct" ? "bg-[var(--surface-800)]" : "opacity-70 hover:opacity-100",
        ].join(" ")}
      >
        % of Spot
      </button>
      <button
        onClick={reload}
        className="ml-2 text-xs px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-800)]"
        title="Refresh spot + IV TS"
      >
        Refresh
      </button>
    </div>
  );

  return (
    <MetricRibbonCard
      title={title}
      className={className}
      items={items}
      loading={loading}
      error={error}
      headerChips={headerChips}
      // Clarified helper text to match the new hook (linear IV interpolation)
      helperText="S × IV × √t · IV interpolated linearly across DTE"
      controls={controls}
    />
  );
}

function formatHorizon(days: number) {
  if (days === 1) return "1D";
  if (days === 7) return "1W";
  if (days === 30) return "30D";
  return `${days}D`;
}

function formatNumber(n: number, decimals = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: decimals }).format(n);
}

function nearestExpiryForDays(
  points: { dteDays: number; expiryTs: number }[],
  days: number
): { expiryLabel: string } | null {
  if (!points.length) return null;
  let best = points[0];
  let bestDiff = Math.abs(points[0].dteDays - days);
  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].dteDays - days);
    if (diff < bestDiff) {
      best = points[i];
      bestDiff = diff;
    }
  }
  const label = new Date(best.expiryTs).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  return { expiryLabel: label };
}
