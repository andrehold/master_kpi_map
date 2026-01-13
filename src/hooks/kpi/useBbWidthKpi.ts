import type { ReactNode } from "react";
import { useBbWidth } from "../domain/useBbWidth";

export type BbWidthRow = {
  id: string;
  metric: string;
  value: string;
  asOf: string;
};

export type BbWidthTableSpec = {
  title: string;
  rows: BbWidthRow[];
};

export type BbWidthKpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null; // width % for bands
  table?: BbWidthTableSpec;
};

export interface UseBbWidthKpiOptions {
  currency?: "BTC" | "ETH";
}

function fmt1(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(1);
}
function fmtSigned1(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}`;
}

function regime(widthPct?: number): string {
  if (widthPct == null || !Number.isFinite(widthPct)) return "—";
  if (widthPct < 8) return "Squeeze (breakout risk)";
  if (widthPct < 16) return "Low width";
  if (widthPct < 28) return "Normal width";
  return "High width";
}

function slope(delta?: number): string | undefined {
  if (delta == null || !Number.isFinite(delta)) return undefined;
  if (delta > 1.0) return "expanding";
  if (delta < -1.0) return "contracting";
  return "stabilizing";
}

export function useBbWidthKpi(opts: UseBbWidthKpiOptions = {}): BbWidthKpiViewModel {
  const currency = opts.currency ?? "BTC";
  const state = useBbWidth({ currency, periodDays: 20, sigma: 2, deltaDays: 5, resolutionSec: 86400 });

  let value: ReactNode = "—";
  let meta: string | undefined;
  let extraBadge: string | null = null;

  const r = regime(state.widthPct);
  const s = slope(state.widthDelta);
  if (state.loading && state.widthPct == null) {
    value = "…";
    meta = "loading";
  } else if (state.error && state.widthPct == null) {
    value = "—";
    meta = "error";
  } else if (typeof state.widthPct === "number") {
    value = `${fmt1(state.widthPct)}%`;
    meta = s ? `${r} (${s})` : r;
  }

  if (state.loading && typeof state.widthPct === "number") extraBadge = "Refreshing…";

  const asOf = state.lastUpdated ? new Date(state.lastUpdated).toLocaleDateString() : "";

  const rows: BbWidthRow[] = [
    { id: "bbw", metric: "BB Width (20,2)", value: state.widthPct == null ? "—" : `${fmt1(state.widthPct)}%`, asOf },
    { id: "dbbw", metric: "ΔWidth (5D)", value: fmtSigned1(state.widthDelta) + " pp", asOf },
    { id: "regime", metric: "Regime", value: r, asOf },
    { id: "mid", metric: "Mid (SMA20)", value: state.mid == null ? "—" : fmt1(state.mid), asOf },
  ];

  return {
    value,
    meta,
    extraBadge,
    guidanceValue: typeof state.widthPct === "number" ? state.widthPct : null,
    table: { title: "Range vs breakout (BB Width)", rows },
  };
}
