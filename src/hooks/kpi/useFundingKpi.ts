// src/hooks/kpis/useFundingKpi.ts
import type { ReactNode } from "react";
import { useDeribitFunding } from "../domain/useDeribitFunding";

export type FundingRow = {
  id: string;
  metric: string;
  value: string;
  asOf: string;
};

export type FundingTableSpec = {
  title: string;
  rows: FundingRow[];
};

export type FundingKpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null; // annualized %, to match bands
  table?: FundingTableSpec;      // for footer mini table
};

export type UseFundingKpiOptions = {
  instrument?: string; // default BTC-PERPETUAL
  locale?: string;     // pass context.locale from the card (optional)
};

const PERIODS_PER_YEAR_8H = 3 * 365;

function fmtPct8h(x: number) {
  return `${(x * 100).toFixed(3)}%`;
}

function fmtPctAnnFrom8h(x8h: number) {
  const annPct = x8h * PERIODS_PER_YEAR_8H * 100;
  return annPct;
}

function fmtPct1(xPct: number) {
  return `${xPct.toFixed(1)}%`;
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
  let guidanceValue: number | null = null;
  let table: FundingTableSpec | undefined;

  const asOf =
    updatedAt
      ? (locale
          ? new Date(updatedAt).toLocaleTimeString(locale)
          : new Date(updatedAt).toLocaleTimeString())
      : "—";

  if (loading && current8h == null) {
    value = "…";
    meta = "loading";
  } else if (error && current8h == null) {
    value = "—";
    meta = "error";
  } else if (typeof current8h === "number") {
    const annPct = fmtPctAnnFrom8h(current8h);
    guidanceValue = annPct;

    // Main value: annualized (matches your bands.json title "Perpetual Funding (ann.)")
    value = fmtPct1(annPct);
    meta = updatedAt ? `Deribit · ${asOf}` : "Deribit";

    // Badge: keep the high-frequency + pressure context visible
    const parts: string[] = [];
    parts.push(`8h ${fmtPct8h(current8h)}`);

    if (typeof avg7d8h === "number") {
      const avgAnnPct = fmtPctAnnFrom8h(avg7d8h);
      parts.push(`7d avg ${fmtPct1(avgAnnPct)}`);
    }
    if (typeof zScore === "number") {
      const crowd = crowdLabel(zScore);
      parts.push(`z ${fmtZ(zScore)}${crowd ? ` · ${crowd}` : ""}`);
    }
    extraBadge = parts.join(" · ");

    // Footer mini table
    const rows: FundingRow[] = [
      { id: "funding_8h", metric: "Funding (8h)", value: fmtPct8h(current8h), asOf },
      { id: "funding_ann", metric: "Funding (ann.)", value: fmtPct1(annPct), asOf },
    ];

    if (typeof avg7d8h === "number") {
      rows.push({
        id: "avg7d_ann",
        metric: "7d avg (ann.)",
        value: fmtPct1(fmtPctAnnFrom8h(avg7d8h)),
        asOf,
      });
    }
    if (typeof zScore === "number") {
      rows.push({
        id: "zscore",
        metric: "Z-score (7d)",
        value: `${fmtZ(zScore)}${crowdLabel(zScore) ? ` · ${crowdLabel(zScore)}` : ""}`,
        asOf,
      });
    }

    table = { title: "Funding details", rows };
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  return { value, meta, extraBadge, guidanceValue, table };
}
