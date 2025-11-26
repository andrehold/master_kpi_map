// src/hooks/kpi/useLiquidityStressKpi.ts
import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Currency } from "../../services/deribit";
import { useLiquidityStress } from "../domain/useLiquidityStress";

export type LiquidityStressRow = {
  id: string;
  label: string;
  spread: string;
  depth: string;
  stress: string;
};

export type LiquidityStressTableSpec = {
  title: string;
  rows: LiquidityStressRow[];
  sections?: { index: number; title: string }[];
};

export type LiquidityStressKpiVm = {
    value: ReactNode;
    meta?: string;
    extraBadge?: string | null;
    guidanceValue?: number | null;
    table?: LiquidityStressTableSpec;
    footerMessage?: string;
  };

type Args = {
  currency: Currency;
  /** Fractional window around mid, e.g. 0.005 = ±0.5% */
  windowPct: number;
  /** Approx size in underlying units, e.g. 10 BTC */
  clipSize: number;
  /** Polling interval (ms). Use 0 to disable. */
  pollMs?: number;
};

export function useLiquidityStressKpi({
  currency,
  windowPct,
  clipSize,
  pollMs = 0,
}: Args): LiquidityStressKpiVm {
  const { loading, error, metrics } = useLiquidityStress({
    currency,
    windowPct,
    clipSize,
    pollMs,
  });

  // Main KPI: combined liquidity stress score (0–1)
  const value = useMemo<ReactNode>(() => {
    if (loading && !metrics) return "…";
    if (error) return "—";
    if (!metrics || typeof metrics.combinedStress !== "number" || !isFinite(metrics.combinedStress)) {
      return "—";
    }
    return fmtPercent(metrics.combinedStress);
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
  const extraBadge = useMemo<string | null>(() => {
    const parts: string[] = [];
    if (typeof windowPct === "number" && windowPct > 0) {
      parts.push(`Window ±${(windowPct * 100).toFixed(1)}%`);
    }
    if (typeof clipSize === "number" && clipSize > 0) {
      parts.push(`Clip ${clipSize} ${currency}`);
    }
    const s = parts.join(" • ");
    return s || null;
  }, [windowPct, clipSize, currency]);

  // Mini-table spec + footer message
  const { table, footerMessage } = useMemo(() => {
    if (error) {
      return {
        table: undefined,
        footerMessage: `Failed to load: ${String(error)}`,
      };
    }

    if (!metrics) {
      return {
        table: undefined,
        footerMessage: loading ? "Loading liquidity…" : "Awaiting data",
      };
    }

    const markets = metrics.markets ?? [];
    if (!markets.length) {
      return {
        table: undefined,
        footerMessage: "No markets in scope",
      };
    }

    const worst =
      markets.reduce<(typeof markets)[number] | undefined>((acc, m) => {
        if (!acc) return m;
        const a = typeof acc.stress === "number" ? acc.stress : 0;
        const b = typeof m.stress === "number" ? m.stress : 0;
        return b > a ? m : acc;
      }, undefined) ?? null;

    const avgSpreadBps =
      typeof metrics.avgSpreadBps === "number" && isFinite(metrics.avgSpreadBps)
        ? `${metrics.avgSpreadBps.toFixed(1)} bps`
        : "—";

    const totalDepth =
      typeof metrics.totalDepth === "number" && isFinite(metrics.totalDepth)
        ? fmtNumber(metrics.totalDepth)
        : "—";

    const rows: LiquidityStressRow[] = markets.map((m) => ({
      id: m.id,
      label: m.label,
      spread:
        typeof m.spreadBps === "number" && isFinite(m.spreadBps)
          ? fmtBps(m.spreadBps)
          : "—",
      depth:
        typeof m.depth === "number" && isFinite(m.depth)
          ? `${fmtNumber(m.depth)} ${currency}`
          : `— ${currency}`,
      stress:
        typeof m.stress === "number" && isFinite(m.stress)
          ? fmtPercent(m.stress)
          : "—",
    }));

    // Summary row at the bottom
    rows.push({
      id: "summary",
      label: worst?.label ? `Worst: ${worst.label}` : "Worst tenor",
      spread: avgSpreadBps,
      depth: `${totalDepth} ${currency}`,
      stress:
        worst && typeof worst.stress === "number" && isFinite(worst.stress)
          ? fmtPercent(worst.stress)
          : "—",
    });

    return {
      table: {
        title: "Market depth & spreads",
        rows,
        sections: [{ index: markets.length, title: "Summary" }],
      },
      footerMessage: undefined,
    };
  }, [metrics, error, loading, currency]);

  const guidanceValue =
    metrics?.combinedStress != null && isFinite(metrics.combinedStress)
      ? metrics.combinedStress * 100
      : null;

  return {
    value,
    meta,
    extraBadge,
    guidanceValue,
    table,
    footerMessage,
  };
}

// Local helpers (can be moved to utils/format if you want)
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
