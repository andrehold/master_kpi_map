import type { ReactNode } from "react";
import { toExpectedMoveRows, type ExpectedMoveStateLike as ExpectedMoveStateLikeLib } from "../../lib/expectedMoveMath";

const EXPECTED_MOVE_PRIMARY_TENOR = 30;

export interface ExpectedMoveRow {
  days: number;
  expiryTs: number | null;
  abs: number | null;
  pct: number | null;
}

export interface ExpectedMoveStateLike extends ExpectedMoveStateLikeLib {
  loading?: boolean;
  error?: unknown;
  asOf?: number | null;
  rows?: ExpectedMoveRow[];
}

export interface EmRibbonRow {
  id: string;
  tenor: string;
  expiry: string;
  abs: string;
  pct: string;
}

export interface EmRibbonTableSpec {
  title: string;
  rows: EmRibbonRow[];
  emptyLabel?: string;
}

export interface EmRibbonKpiViewModel {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null;
  table?: EmRibbonTableSpec;
}

/**
 * Pure view-model builder for the "Expected Move ribbon" KPI.
 *
 * It takes the existing expectedMove state + locale and returns card-ready data:
 * - value/meta/extraBadge for the main KPI
 * - table spec for the mini table footer
 */
export function useEmRibbonKpi(
  emContext: ExpectedMoveStateLike | null | undefined,
  locale: string
): EmRibbonKpiViewModel {
  const rows = emContext?.rows ?? toExpectedMoveRows(emContext);
  const sortedRows = [...rows].sort((a, b) => a.days - b.days);
  const primaryRow = sortedRows.find(
    (row) => row.days === EXPECTED_MOVE_PRIMARY_TENOR
  );

  let value: ReactNode = "—";
  let meta: string | undefined;
  let extraBadge: string | null = null;

  if (!emContext) {
    value = "—";
    meta = "Expected Move unavailable";
  } else if (emContext.loading && !primaryRow) {
    value = "…";
    meta = "loading";
  } else if (emContext.error) {
    value = "—";
    meta = "error";
  } else if (primaryRow) {
    value = formatEmAbsolute(primaryRow.abs, locale) ?? "—";
    meta = `Exp ${formatExpiryLabel(primaryRow.expiryTs, locale)} · ${formatTenorLabel(
      primaryRow.days
    )}`;

    const pctBadge = formatEmPercent(primaryRow.pct);
    if (emContext.loading) {
      extraBadge = pctBadge ? `${pctBadge} · updating…` : "Refreshing…";
    } else {
      extraBadge = pctBadge;
    }
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  const tableRows: EmRibbonRow[] = sortedRows
    .filter((row) => row.days !== EXPECTED_MOVE_PRIMARY_TENOR)
    .map((row) => ({
      id: String(row.days),
      tenor: formatTenorLabel(row.days),
      expiry: formatExpiryLabel(row.expiryTs, locale),
      abs: formatEmAbsolute(row.abs, locale) ?? "—",
      pct: formatEmPercent(row.pct) ?? "—",
    }));

  const table: EmRibbonTableSpec = {
    title: "Additional tenors",
    rows: tableRows,
    emptyLabel: "Waiting for data",
  };

  return {
    value,
    meta,
    extraBadge,
    guidanceValue: null, // no bands for EM (for now)
    table,
  };
}

// Helpers copied from your current KpiCardRenderer for consistency

function formatTenorLabel(days: number) {
  if (days === 1) return "1D";
  if (days === 7) return "1W";
  if (days === 30) return "30D";
  if (days === 90) return "3M";
  if (days % 30 === 0) return `${Math.round(days / 30)}M`;
  return `${days}D`;
}

function formatExpiryLabel(expiryTs: number | null, locale: string) {
  if (expiryTs == null || !isFinite(expiryTs)) return "—";
  return new Date(expiryTs).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

function formatEmAbsolute(value: number | null, locale: string) {
  if (value == null || !isFinite(value)) return null;
  const magnitude = Math.abs(value);
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: magnitude >= 1000 ? 0 : magnitude >= 100 ? 1 : 2,
  });
  return `±$${formatter.format(value)}`;
}

function formatEmPercent(value: number | null) {
  if (value == null || !isFinite(value)) return null;
  const pct = value * 100;
  const decimals = Math.abs(pct) >= 10 ? 1 : 2;
  return `±${pct.toFixed(decimals)}%`;
}
