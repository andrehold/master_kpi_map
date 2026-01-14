import type { ReactNode } from "react";
import { atrWilderLast, windowBarsFromDays, type OhlcCandle } from "../../lib/ohlc";
import { pickEmForDays } from "../../lib/expectedMoveMath";
import { usePerpHistory } from "../domain/usePerpHistory";
import { useExpectedMove } from "../domain/useExpectedMove";

export type AtrEmRow = {
  id: string;
  metric: string;
  value: string;
  asOf: string;
};

export type AtrEmTableSpec = {
  title: string;
  rows: AtrEmRow[];
};

export type AtrEmKpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null; // ratio for bands
  table?: AtrEmTableSpec;
};

export interface UseShortHorizonAtrEmKpiOptions {
  currency?: "BTC" | "ETH";
  /** ATR window in DAYS (short horizon). Default 5. */
  atrDays?: number;
  /** Expected move horizon in DAYS. Default 5. */
  horizonDays?: number;
  /** Bar resolution. Default daily. */
  resolutionSec?: number;
}

function fmt0(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(0);
}
function fmt2(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(2);
}
function pct1(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function asDate(ts?: number) {
  return ts ? new Date(ts).toLocaleDateString() : "";
}

function metaForRatio(r?: number): string | undefined {
  if (r == null || !Number.isFinite(r)) return undefined;
  if (r <= 0.7) return "Implied > realized (premium relatively rich)";
  if (r <= 1.0) return "Realized ≈ implied (balanced)";
  return "Realized ≥ implied (move risk elevated)";
}

/**
 * Short-horizon ATR / Expected Move
 * - ATR computed from PERP OHLC (Wilder)
 * - EM/IV comes from useExpectedMove via pickEmForDays()
 */
export function useShortHorizonAtrEmKpi(
  opts: UseShortHorizonAtrEmKpiOptions = {}
): AtrEmKpiViewModel {
  const {
    currency = "BTC",
    atrDays = 5,
    horizonDays = 5,
    resolutionSec = 86400,
  } = opts;

  const perp = (usePerpHistory as any)({ currency, limit: 500, resolutionSec }) as any;
  const emState = (useExpectedMove as any)({ currency, horizonDays }) as any;

  const candles: OhlcCandle[] | undefined =
    (perp?.candles ?? perp?.history ?? perp?.data ?? perp?.series) as any;

  const loading = Boolean(perp?.loading || emState?.loading);
  const error: string | undefined = (perp?.error ?? emState?.error) as any;

  const lastUpdated: number | undefined = (() => {
    const a = (perp?.lastUpdated ?? perp?.ts) as number | undefined;
    const b = (emState?.lastUpdated ?? emState?.ts) as number | undefined;
    if (!a && !b) return undefined;
    return Math.max(a ?? 0, b ?? 0);
  })();

  // ✅ unified extraction (handles em as number/object/map)
  const picked = pickEmForDays(emState, horizonDays);

  const spot = picked.spot ?? null;
  const expectedMove = picked.emAbs ?? null;
  const atmIvDec = picked.ivAnnDec ?? null;

  // ATR
  const periodBars = windowBarsFromDays(atrDays, resolutionSec);
  const atr: number | undefined = candles ? atrWilderLast(candles, periodBars) : undefined;

  // Ratio
  const ratio =
    atr != null && expectedMove != null && expectedMove > 0 ? atr / expectedMove : undefined;

  let value: ReactNode = ratio == null ? "—" : `${fmt2(ratio)}×`;
  let meta: string | undefined;
  let extraBadge: string | null = `${horizonDays}d`;

  if (loading && ratio == null) {
    value = "…";
    meta = "loading";
  } else if (error && ratio == null) {
    value = "—";
    meta = "error";
  } else if (typeof ratio === "number") {
    value = `${fmt2(ratio)}×`;
    meta = metaForRatio(ratio);
  }

  if (!loading && !error && ratio == null) {
    meta =
      (candles ? "" : "no candles; ") +
      (spot == null ? "no spot; " : "") +
      (atmIvDec == null ? "no ATM IV; " : "") +
      (expectedMove == null ? "no EM; " : "") +
      (atr == null ? "no ATR; " : "") +
      ` (em source: ${picked.source})`;
  }

  const asOf = asDate(lastUpdated);

  const rows: AtrEmRow[] = [
    { id: "spot", metric: "Spot", value: fmt0(spot), asOf },
    { id: "atmIv", metric: "ATM IV (ann.)", value: pct1(atmIvDec), asOf },
    { id: "atr", metric: `ATR (${atrDays}D)`, value: fmt0(atr), asOf },
    { id: "em", metric: `${horizonDays}D Expected Move`, value: fmt0(expectedMove), asOf },
    { id: "ratio", metric: "ATR / EM", value: ratio == null ? "—" : `${fmt2(ratio)}×`, asOf },
  ];

  return {
    value,
    meta,
    extraBadge,
    guidanceValue: typeof ratio === "number" ? ratio : null,
    table: {
      title: "Short-horizon realized vs implied",
      rows,
    },
  };
}
