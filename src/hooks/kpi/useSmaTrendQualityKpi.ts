import { useEffect, useState } from "react";
import { fetchPerpHistory, type Currency, type PriceCandle } from "../../services/deribit";

export type SmaTrendQualityStatus = "loading" | "ready" | "error";

export type SmaTrendQualityRow = {
  id: string;
  metric: string;
  value: string;
};

export type SmaTrendQualityKpiViewModel = {
  status: SmaTrendQualityStatus;
  value: string | null;
  meta?: string;
  extraBadge?: string | null;
  errorMessage?: string | null;
  rows: SmaTrendQualityRow[];
};

function sma(closes: number[], endIdx: number, window: number): number | null {
  if (endIdx - window + 1 < 0) return null;
  let sum = 0;
  for (let i = endIdx - window + 1; i <= endIdx; i += 1) sum += closes[i];
  return sum / window;
}

function computeAtr(candles: PriceCandle[], window: number): number | null {
  // ATR in price units (simple average of True Range over `window` periods)
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const c = candles[i];
    const p = candles[i - 1];
    if (typeof c.high !== "number" || typeof c.low !== "number") continue;

    const prevClose = p.close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose),
    );
    if (Number.isFinite(tr)) trs.push(tr);
  }
  if (trs.length < window) return null;
  const slice = trs.slice(-window);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / window;
}

function fmtPct(v: number, digits = 1): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function fmtBpsPerDay(vBps: number, digits = 0): string {
  return `${vBps >= 0 ? "+" : ""}${vBps.toFixed(digits)} bps/d`;
}

function classify(args: {
  sepPct: number;
  slope50Bps: number;
  slope100Bps: number;
}): { direction: string; regime: string } {
  const { sepPct, slope50Bps, slope100Bps } = args;

  const alignedUp = sepPct > 0 && slope50Bps > 0 && slope100Bps > 0;
  const alignedDown = sepPct < 0 && slope50Bps < 0 && slope100Bps < 0;

  const direction = alignedUp ? "uptrend" : alignedDown ? "downtrend" : "mixed";

  const sepAbs = Math.abs(sepPct);
  const s50 = Math.abs(slope50Bps);
  const s100 = Math.abs(slope100Bps);

  // Heuristics tuned for “short premium carry” risk framing:
  // - small separation + flat slopes => range-friendly
  // - big separation + meaningful slope => grindy trend risk
  const rangeFriendly = sepAbs < 2 && s50 < 5 && s100 < 3;
  const grindyTrendRisk = sepAbs >= 6 && (s50 >= 10 || s100 >= 6);

  const regime = rangeFriendly
    ? "range-friendly"
    : grindyTrendRisk
    ? "grindy trend risk"
    : "transition";

  return { direction, regime };
}

/**
 * Trend quality via:
 * - MA50 slope and MA100 slope (normalized by price -> bps/day; also shows ATR/day if available)
 * - MA separation: (MA50 - MA100) / spot (in %)
 *
 * Main KPI value is the separation %, which also drives the band bar.
 */
export function useSmaTrendQualityKpi(currency: Currency = "BTC"): SmaTrendQualityKpiViewModel {
  const [state, setState] = useState<SmaTrendQualityKpiViewModel>({
    status: "loading",
    value: null,
    rows: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState((s) => ({ ...s, status: "loading", errorMessage: null }));

      try {
        // ~1y daily data is enough for 100D SMA + ATR window
        const candles = await fetchPerpHistory(currency, 260, 86400);
        if (!candles.length) throw new Error("No price history");

        const closes = candles.map((c) => c.close);
        const idxLast = closes.length - 1;
        const spot = closes[idxLast];
        if (!Number.isFinite(spot) || spot <= 0) throw new Error("Bad spot price");

        const sma50Now = sma(closes, idxLast, 50);
        const sma50Prev = sma(closes, idxLast - 1, 50);
        const sma100Now = sma(closes, idxLast, 100);
        const sma100Prev = sma(closes, idxLast - 1, 100);

        if (sma50Now == null || sma50Prev == null || sma100Now == null || sma100Prev == null) {
          throw new Error("Not enough history for 50D/100D SMAs");
        }

        // Separation (percent of spot)
        const sepPct = ((sma50Now - sma100Now) / spot) * 100;

        // Slopes: normalize by spot -> bps/day
        const slope50 = sma50Now - sma50Prev;
        const slope100 = sma100Now - sma100Prev;

        const slope50Bps = (slope50 / spot) * 10_000;
        const slope100Bps = (slope100 / spot) * 10_000;

        // Optional ATR normalization
        const atr14 = computeAtr(candles, 14);

        const { direction, regime } = classify({ sepPct, slope50Bps, slope100Bps });

        // Main value: separation (first numeric -> band parsing stays simple)
        const value = `${fmtPct(sepPct)} MA50−MA100`;
        const meta = `${direction} • ${regime}`;

        const rows: SmaTrendQualityRow[] = [
          {
            id: "sep",
            metric: "MA separation (MA50−MA100)/spot",
            value: fmtPct(sepPct),
          },
          {
            id: "s50",
            metric: "50D slope (bps/day)",
            value: fmtBpsPerDay(slope50Bps),
          },
          {
            id: "s100",
            metric: "100D slope (bps/day)",
            value: fmtBpsPerDay(slope100Bps),
          },
        ];

        if (atr14 != null && atr14 > 0) {
          rows.push({
            id: "atr14",
            metric: "ATR(14) (price units)",
            value: atr14.toLocaleString(undefined, { maximumFractionDigits: 0 }),
          });
        }

        if (cancelled) return;

        setState({
          status: "ready",
          value,
          meta,
          extraBadge: "MA slope + separation",
          errorMessage: null,
          rows,
        });
      } catch (err: any) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          status: "error",
          errorMessage: err?.message ?? String(err),
          rows: s.rows ?? [],
        }));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [currency]);

  return state;
}
