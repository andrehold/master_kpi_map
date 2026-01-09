// src/hooks/kpis/useVwapAnchorsKpi.ts
import { useMemo } from "react";
import type { Currency, PriceCandle } from "../../services/deribit";
import { usePerpHistory } from "../domain/usePerpHistory";
import { useAdx } from "../domain/useAdx";

import {
  computeSessionVwapTodayBerlin,
  computeVwapFrom,
  findEventCandleIndex,
  findLastSwingPivot,
  findMonthOpenIndex,
  pctDistance,
  type VwapCandle as VwapCandle,
} from "../../lib/vwap";

export type VwapAnchorsStatus = "loading" | "ready" | "error";

export type VwapAnchorsRow = {
  id: string;
  metric: string;
  formatted: string;
  value?: number | null;
};

export type VwapAnchorsKpiViewModel = {
  status: VwapAnchorsStatus;
  value: string | null;
  meta?: string;
  guidanceValue: number | null;
  errorMessage: string | null;
  rows: VwapAnchorsRow[];
};

function toVwapCandle(c: PriceCandle): VwapCandle | null {
  const close = c.close;
  if (!Number.isFinite(close) || close <= 0) return null;

  const open = Number.isFinite(c.open as any) ? (c.open as number) : close;
  const high = Number.isFinite(c.high as any) ? (c.high as number) : close;
  const low = Number.isFinite(c.low as any) ? (c.low as number) : close;
  const volume = Number.isFinite(c.volume as any) ? (c.volume as number) : 0;

  return { ts: c.ts, open, high, low, close, volume };
}

function fmt0(n: number) {
  return Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function fmt1(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
function fmt2(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtSignedPct(n: number, digits = 2) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function useVwapAnchorsKpi(opts: { currency?: Currency } = {}): VwapAnchorsKpiViewModel {
  const currency = opts.currency ?? "BTC";

  // ✅ Hourly history for VWAP/AVWAP anchors
  const hist = usePerpHistory({
    currency,
    limit: 900,          // ~37.5 days of 1h bars
    resolutionSec: 3600, // 1h
    staleMs: 60_000,
  });

  // ✅ Reuse your existing ADX domain hook (no duplicate daily fetch here)
  const adx = useAdx({ currency, periodDays: 14, deltaDays: 5, resolutionSec: 86400 });

  return useMemo(() => {
    // ---- status/error handling (don’t hide cached values while refreshing) ----
    if (hist.loading && hist.candles.length === 0) {
      return { status: "loading", value: null, meta: undefined, guidanceValue: null, errorMessage: null, rows: [] };
    }
    if (hist.error && hist.candles.length === 0) {
      return { status: "error", value: null, meta: undefined, guidanceValue: null, errorMessage: hist.error, rows: [] };
    }

    const now = Date.now();
    const hourly = (hist.candles ?? [])
      .map(toVwapCandle)
      .filter((x): x is VwapCandle => !!x)
      .sort((a, b) => a.ts - b.ts);

    if (hourly.length < 20) {
      return {
        status: "error",
        value: null,
        meta: undefined,
        guidanceValue: null,
        errorMessage: "Not enough hourly history for VWAP/anchors.",
        rows: [],
      };
    }

    const spot = hourly[hourly.length - 1].close;

    const sessionVwap = computeSessionVwapTodayBerlin(hourly, now);

    const pivot = findLastSwingPivot(hourly, { left: 3, right: 3, lookbackCandles: 500 });
    const swingIdx = pivot?.index ?? null;

    const monthIdx = findMonthOpenIndex(hourly, now);
    const eventIdx = findEventCandleIndex(hourly, now, 14);

    const avwapSwing = swingIdx != null ? computeVwapFrom(hourly, swingIdx) : null;
    const avwapMonth = monthIdx >= 0 ? computeVwapFrom(hourly, monthIdx) : null;
    const avwapEvent = eventIdx != null ? computeVwapFrom(hourly, eventIdx) : null;

    const dVwap = sessionVwap != null ? pctDistance(spot, sessionVwap) : null;
    const dSwing = avwapSwing != null ? pctDistance(spot, avwapSwing) : null;
    const dMonth = avwapMonth != null ? pctDistance(spot, avwapMonth) : null;
    const dEvent = avwapEvent != null ? pctDistance(spot, avwapEvent) : null;

    const candidates = [
      {
        label: pivot ? `AVWAP (last swing ${pivot.kind})` : "AVWAP (last swing)",
        d: dSwing,
      },
      { label: "AVWAP (monthly open)", d: dMonth },
      { label: "AVWAP (event candle, 14d)", d: dEvent },
    ].filter((x): x is { label: string; d: number } => typeof x.d === "number" && Number.isFinite(x.d));

    const best = candidates.sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0] ?? null;

    const adx14 = typeof adx.adx === "number" && Number.isFinite(adx.adx) ? adx.adx : null;
    const adxHot = adx14 != null && adx14 >= 25;

    const rows: VwapAnchorsRow[] = [];
    rows.push({ id: "spot", metric: "Spot", formatted: fmt0(spot), value: spot });

    if (sessionVwap != null) rows.push({ id: "vwap", metric: "Session VWAP (today, Berlin)", formatted: fmt0(sessionVwap), value: sessionVwap });
    if (dVwap != null) rows.push({ id: "d_vwap", metric: "Spot vs VWAP", formatted: fmtSignedPct(dVwap, 2), value: dVwap });

    if (avwapSwing != null) rows.push({
      id: "avwap_swing",
      metric: pivot ? `Anchored VWAP (swing ${pivot.kind})` : "Anchored VWAP (last swing)",
      formatted: fmt0(avwapSwing),
      value: avwapSwing,
    });
    if (dSwing != null) rows.push({ id: "d_swing", metric: "Spot vs AVWAP (swing)", formatted: fmtSignedPct(dSwing, 2), value: dSwing });

    if (avwapMonth != null) rows.push({ id: "avwap_month", metric: "Anchored VWAP (monthly open)", formatted: fmt0(avwapMonth), value: avwapMonth });
    if (dMonth != null) rows.push({ id: "d_month", metric: "Spot vs AVWAP (month)", formatted: fmtSignedPct(dMonth, 2), value: dMonth });

    if (avwapEvent != null) rows.push({ id: "avwap_event", metric: "Anchored VWAP (event candle, 14d)", formatted: fmt0(avwapEvent), value: avwapEvent });
    if (dEvent != null) rows.push({ id: "d_event", metric: "Spot vs AVWAP (event)", formatted: fmtSignedPct(dEvent, 2), value: dEvent });

    if (adx14 != null) rows.push({ id: "adx14", metric: "ADX(14) (daily)", formatted: fmt1(adx14), value: adx14 });

    // Headline value + guidance
    let value: string | null = null;
    let meta: string | undefined;
    let guidanceValue: number | null = null;

    if (best) {
      value = fmtSignedPct(best.d, 1);
      guidanceValue = Math.abs(best.d);

      const parts: string[] = [];
      parts.push(`Max stretch vs ${best.label} (abs ${fmt2(Math.abs(best.d))}%)`);

      if (adx14 != null) parts.push(`ADX ${fmt1(adx14)}${adxHot ? " (hot)" : ""}`);
      if (hist.error) parts.push(`History: ${hist.error}`);
      if (adx.error) parts.push(`ADX: ${adx.error}`);

      // options mapping hint
      if (adxHot) {
        parts.push("Trend strong → stretch can persist; prefer wider/defined risk.");
      } else {
        parts.push("Non-hot ADX → stretch more likely to mean-revert (carry-friendly).");
      }

      meta = parts.join(" • ");
    } else {
      value = "—";
      guidanceValue = null;
      meta = "Could not compute any AVWAP anchors (check volume data).";
    }

    // If we’re refreshing in the background, still show ready values.
    const status: VwapAnchorsStatus = hist.error && hist.candles.length === 0 ? "error" : "ready";

    return {
      status,
      value,
      meta,
      guidanceValue,
      errorMessage: hist.error ?? null,
      rows,
    };
  }, [hist.loading, hist.error, hist.candles, adx.adx, adx.error]);
}
