import type { Candle } from "./vwap";
import { monthKeyBerlin } from "./vwap";

function isPivotHigh(candles: Candle[], i: number, left: number, right: number) {
  const h = candles[i].high;
  for (let k = i - left; k <= i + right; k++) {
    if (k === i) continue;
    if (k < 0 || k >= candles.length) return false;
    if (candles[k].high >= h) return false;
  }
  return true;
}
function isPivotLow(candles: Candle[], i: number, left: number, right: number) {
  const l = candles[i].low;
  for (let k = i - left; k <= i + right; k++) {
    if (k === i) continue;
    if (k < 0 || k >= candles.length) return false;
    if (candles[k].low <= l) return false;
  }
  return true;
}

export function findLastSwingPivot(
  candles: Candle[],
  opts?: { left?: number; right?: number; lookbackCandles?: number }
): { index: number; kind: "high" | "low" } | null {
  const left = opts?.left ?? 3;
  const right = opts?.right ?? 3;
  const lookback = opts?.lookbackCandles ?? Math.min(candles.length, 500);
  const start = Math.max(0, candles.length - lookback);

  for (let i = candles.length - 1 - right; i >= start + left; i--) {
    if (isPivotHigh(candles, i, left, right)) return { index: i, kind: "high" };
    if (isPivotLow(candles, i, left, right)) return { index: i, kind: "low" };
  }
  return null;
}

export function findMonthOpenIndex(candles: Candle[], nowTsMs: number) {
  const curMonth = monthKeyBerlin(nowTsMs);
  return candles.findIndex((c) => monthKeyBerlin(c.ts) === curMonth);
}

export function findEventCandleIndex(candles: Candle[], nowTsMs: number, lookbackDays = 14) {
  const cutoff = nowTsMs - lookbackDays * 24 * 60 * 60 * 1000;
  let bestIdx = -1;
  let bestScore = -Infinity;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    if (c.ts < cutoff) continue;

    const range = Math.max(0, c.high - c.low);
    const vol = Number.isFinite(c.volume) ? (c.volume as number) : 1;
    const score = range * vol;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx >= 0 ? bestIdx : null;
}

/** Small, robust ADX(14) */
export function computeAdx(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 2) return null;

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];

    const upMove = c.high - p.high;
    const downMove = p.low - c.low;

    const trVal = Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close)
    );
    tr.push(trVal);

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Wilder smoothing
  let tr14 = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let p14 = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let m14 = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dx: number[] = [];

  for (let i = period; i < tr.length; i++) {
    const pdi = tr14 === 0 ? 0 : (100 * p14) / tr14;
    const mdi = tr14 === 0 ? 0 : (100 * m14) / tr14;
    const denom = pdi + mdi;
    const dxVal = denom === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / denom;
    dx.push(dxVal);

    // update smooth
    tr14 = tr14 - tr14 / period + tr[i];
    p14 = p14 - p14 / period + plusDM[i];
    m14 = m14 - m14 / period + minusDM[i];
  }

  if (dx.length < period) return null;

  // ADX = Wilder smoothing of DX
  let adx = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dx.length; i++) {
    adx = (adx * (period - 1) + dx[i]) / period;
  }
  return adx;
}
