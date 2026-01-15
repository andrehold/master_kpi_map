// src/hooks/kpis/useFundingKpi.ts
import type { ReactNode } from "react";
import { useDeribitFunding } from "../domain/useDeribitFunding";

export type FundingKpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
};

export type UseFundingKpiOptions = {
  instrument?: string; // default BTC-PERPETUAL
  locale?: string;     // pass context.locale from the card (optional)
};

function fmtPct8h(x: number) {
  return `${(x * 100).toFixed(3)}%`;
}

function fmtZ(z: number) {
  const s = z >= 0 ? "+" : "";
  return `${s}${z.toFixed(1)}`;
}

function crowdLabel(z: number) {
  const a = Math.abs(z);
  if (a >= 2) return z > 0 ? "upside crowding" : "downside crowding";
  if (a >= 1) return z > 0 ? "mild upside crowding" : "mild downside crowding";
  return null;
}

export function useFundingKpi(opts: UseFundingKpiOptions = {}): FundingKpiViewModel {
  const instrument = opts.instrument ?? "BTC-PERPETUAL";
  const locale = opts.locale;

  const state = useDeribitFunding(instrument);
  const { loading, error, current8h, avg7d8h, zScore, updatedAt } = state;

  let value: ReactNode = "—";
  let meta: string | undefined;
  let extraBadge: string | null = null;

  if (loading && current8h == null) {
    value = "…";
    meta = "loading";
  } else if (error && current8h == null) {
    value = "—";
    meta = "error";
  } else if (typeof current8h === "number") {
    value = fmtPct8h(current8h);

    if (updatedAt) {
      const t = new Date(updatedAt);
      meta = `Deribit 8h · ${locale ? t.toLocaleTimeString(locale) : t.toLocaleTimeString()}`;
    } else {
      meta = "Deribit 8h";
    }

    const parts: string[] = [];
    if (typeof avg7d8h === "number") parts.push(`7d avg ${fmtPct8h(avg7d8h)}`);
    if (typeof zScore === "number") {
      const crowd = crowdLabel(zScore);
      parts.push(`z ${fmtZ(zScore)}${crowd ? ` · ${crowd}` : ""}`);
    }
    extraBadge = parts.length ? parts.join(" · ") : null;
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  return { value, meta, extraBadge };
}
