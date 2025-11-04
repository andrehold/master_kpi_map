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
  const { data, loading, error, refresh } = useExpectedMove({ currency });
  const [mode, setMode] = useState<Mode>("abs");

  const items: RibbonItem[] = useMemo(() => {
    const s = typeof data.spot === "number" && isFinite(data.spot) ? data.spot : null;
    return data.items.map((it) => {
      let value: string | undefined;
      if (typeof it.em === "number") {
        if (mode === "abs") {
          value = `± ${formatNumber(it.em, it.days >= 30 ? 0 : 0)}`;
        } else {
          value = s && s > 0 ? `± ${(it.em / s * 100).toFixed(2)}%` : undefined;
        }
      }
      const badge = typeof it.ivPct === "number" ? `IV ${it.label} ${it.ivPct.toFixed(1)}%` : undefined;
      const footnote =
        `S × IV × √t · √t ${(Math.sqrt(it.days / 365)).toFixed(3)}` +
        (it.expiryTs
          ? ` · Exp ${it.expiryLabel ?? new Date(it.expiryTs).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}`
          : "");
      return { id: it.id, label: it.label, value, badge, footnote };
    });
  }, [data.items, data.spot, mode]);

  const headerChips = useMemo(() => {
    const chips: string[] = [];
    if (typeof data.spot === "number" && isFinite(data.spot)) chips.push(`Spot ${formatNumber(data.spot)}`);
    if (data.tsAsOf) chips.push(`IV TS ${new Date(data.tsAsOf).toLocaleTimeString()}`);
    return chips;
  }, [data.spot, data.tsAsOf]);

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
        onClick={refresh}
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
      controls={controls}
      helperText="S × IV × √t · IV interpolated in variance space"
    />
  );
}

function formatNumber(n: number, decimals = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: decimals }).format(n);
}
