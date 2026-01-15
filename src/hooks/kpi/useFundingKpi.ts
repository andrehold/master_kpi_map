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
  guidanceValue?: number | null; // <-- bands drive off this
  table?: FundingTableSpec;      // <-- mini table rows
};

export type UseFundingKpiOptions = {
  instrument?: string;
  locale?: string;
};

function fmtPct8h(x?: number) {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(3)}%`;
}

function fmtZ(z?: number) {
  if (z == null || !Number.isFinite(z)) return "—";
  const s = z >= 0 ? "+" : "";
  return `${s}${z.toFixed(1)}`;
}

function crowdLabel(z?: number) {
  if (z == null || !Number.isFinite(z)) return null;
  const a = Math.abs(z);
  if (a >= 2) return z > 0 ? "upside crowding" : "downside crowding";
  if (a >= 1) return z > 0 ? "mild upside crowding" : "mild downside crowding";
  return null;
}

export function useFundingKpi(opts: UseFundingKpiOptions = {}): FundingKpiViewModel {
  const instrument = opts.instrument ?? "BTC-PERPETUAL";
  const locale = opts.locale;

  const state = useDeribitFunding(instrument);
  const { loading, error, current8h, avg7d8h, zScore, zLookbackDays, updatedAt } = state as any;

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

    // Keep badge lightweight; details go into miniTable
    if (loading) extraBadge = "Refreshing…";
    else {
      const crowd = crowdLabel(zScore);
      if (crowd && typeof zScore === "number" && Math.abs(zScore) >= 2) extraBadge = crowd;
    }
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  const asOf =
    updatedAt != null
      ? (locale ? new Date(updatedAt).toLocaleDateString(locale) : new Date(updatedAt).toLocaleDateString())
      : "";

  const zMetric = zLookbackDays ? `Z-score (${zLookbackDays}d)` : "Z-score";
  const pressure = crowdLabel(zScore) ?? "—";

  const rows: FundingRow[] = [
    { id: "cur", metric: "Funding (8h)", value: fmtPct8h(current8h), asOf },
    { id: "avg7", metric: "Avg (7d)", value: fmtPct8h(avg7d8h), asOf },
    { id: "z", metric: zMetric, value: fmtZ(zScore), asOf },
    { id: "pressure", metric: "Pressure", value: pressure, asOf },
  ];

  // Bands: use magnitude only (risk filter). Thresholds will be 1 / 2 sigmas.
  const guidanceValue = typeof zScore === "number" ? Math.abs(zScore) : null;

  return {
    value,
    meta,
    extraBadge,
    guidanceValue,
    table: { title: "Perps pressure (funding)", rows },
  };
}
