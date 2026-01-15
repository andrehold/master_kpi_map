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
  guidanceValue?: number | null; // drives bands
  table?: FundingTableSpec;      // mini table
};

export type UseFundingKpiOptions = {
  instrument?: string;
  locale?: string;
};

const PERIODS_PER_YEAR_8H = 3 * 365; // 1095

function fmtPct(x?: number, d = 1) {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${x.toFixed(d)}%`;
}
function fmtZ(z?: number) {
  if (z == null || !Number.isFinite(z)) return "—";
  const s = z >= 0 ? "+" : "";
  return `${s}${z.toFixed(1)}`;
}
function crowdLabel(z?: number) {
  if (z == null || !Number.isFinite(z)) return "—";
  const a = Math.abs(z);
  if (a >= 2) return z > 0 ? "upside crowding" : "downside crowding";
  if (a >= 1) return z > 0 ? "mild upside crowding" : "mild downside crowding";
  return "normal";
}

export function useFundingKpi(opts: UseFundingKpiOptions = {}): FundingKpiViewModel {
  const instrument = opts.instrument ?? "BTC-PERPETUAL";
  const locale = opts.locale;

  const { loading, error, current8h, avg7d8h, zScore, updatedAt } = useDeribitFunding(instrument);

  // Convert per-8h decimal -> annualized percent points
  const curAnnPct =
    typeof current8h === "number" ? current8h * PERIODS_PER_YEAR_8H * 100 : undefined;
  const avgAnnPct =
    typeof avg7d8h === "number" ? avg7d8h * PERIODS_PER_YEAR_8H * 100 : undefined;

  let value: ReactNode = "—";
  let meta: string | undefined;
  let extraBadge: string | null = null;

  if (loading && curAnnPct == null) {
    value = "…";
    meta = "loading";
  } else if (error && curAnnPct == null) {
    value = "—";
    meta = "error";
  } else if (typeof curAnnPct === "number") {
    value = fmtPct(curAnnPct, 1);
    if (updatedAt) {
      const t = new Date(updatedAt);
      meta = `Funding (ann.) · ${locale ? t.toLocaleTimeString(locale) : t.toLocaleTimeString()}`;
    } else {
      meta = "Funding (ann.)";
    }

    // Optional: only show a short badge when it’s extreme
    if (!loading && typeof zScore === "number" && Math.abs(zScore) >= 2) {
      extraBadge = crowdLabel(zScore);
    }
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  const asOf =
    updatedAt != null
      ? (locale ? new Date(updatedAt).toLocaleDateString(locale) : new Date(updatedAt).toLocaleDateString())
      : "";

  const rows: FundingRow[] = [
    { id: "cur", metric: "Funding (ann.)", value: fmtPct(curAnnPct, 1), asOf },
    { id: "avg7", metric: "Avg (7d, ann.)", value: fmtPct(avgAnnPct, 1), asOf },
    { id: "z", metric: "Z-score (7d)", value: fmtZ(zScore), asOf },
    { id: "pressure", metric: "Pressure", value: crowdLabel(zScore), asOf },
  ];

  return {
    value,
    meta,
    extraBadge,
    guidanceValue: typeof curAnnPct === "number" ? curAnnPct : null, // matches bands.base.ts funding thresholds
    table: { title: "Perps pressure (funding)", rows },
  };
}
