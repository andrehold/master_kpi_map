// src/hooks/kpis/useAdxKpi.ts
import type { ReactNode } from "react";
import { useAdx } from "../domain/useAdx";

export type AdxRow = {
  id: string;
  metric: string;
  value: string;
  asOf: string;
};

export type AdxTableSpec = {
  title: string;
  rows: AdxRow[];
};

export type AdxKpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null; // ADX level for bands
  table?: AdxTableSpec;
};

export interface UseAdxKpiOptions {
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

function regimeLabel(adx?: number): string | undefined {
  if (adx == null || !Number.isFinite(adx)) return undefined;
  if (adx < 15) return "Range regime";
  if (adx < 25) return "Transition";
  if (adx < 35) return "Trending";
  return "Strong trend";
}

function slopeLabel(delta?: number): string | undefined {
  if (delta == null || !Number.isFinite(delta)) return undefined;
  if (delta > 0.5) return "rising";
  if (delta < -0.5) return "falling";
  return "flat";
}

export function useAdxKpi(opts: UseAdxKpiOptions = {}): AdxKpiViewModel {
  const currency = opts.currency ?? "BTC";
  const state = useAdx({ currency, periodDays: 14, deltaDays: 5, resolutionSec: 86400 });

  let value: ReactNode = "—";
  let meta: string | undefined;
  let extraBadge: string | null = null;

  if (state.loading && state.adx == null) {
    value = "…";
    meta = "loading";
  } else if (state.error && state.adx == null) {
    value = "—";
    meta = "error";
  } else if (typeof state.adx === "number") {
    value = fmt1(state.adx);
    const r = regimeLabel(state.adx);
    const s = slopeLabel(state.adxDelta);
    meta = r ? (s ? `${r} (${s})` : r) : undefined;
  }

  if (state.loading && typeof state.adx === "number") {
    extraBadge = "Refreshing…";
  }

  const asOf = state.lastUpdated
    ? new Date(state.lastUpdated).toLocaleDateString()
    : "";

  const rows: AdxRow[] = [
    { id: "adx14", metric: "ADX (14)", value: fmt1(state.adx), asOf },
    { id: "dAdx5", metric: "ΔADX (5D)", value: fmtSigned1(state.adxDelta), asOf },
    { id: "diPlus14", metric: "+DI (14)", value: fmt1(state.diPlus), asOf },
    { id: "diMinus14", metric: "−DI (14)", value: fmt1(state.diMinus), asOf },
  ];

  const table: AdxTableSpec | undefined = {
    title: "Trend strength (Wilder)",
    rows,
  };

  const guidanceValue = typeof state.adx === "number" ? state.adx : null;

  return {
    value,
    meta,
    extraBadge,
    guidanceValue,
    table,
  };
}
