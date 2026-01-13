// src/lib/ohlc.ts

export type OhlcCandle = {
  ts: number;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
};

function isNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function sortCandlesAsc<T extends { ts: number }>(candles: T[]): T[] {
  return [...candles].sort((a, b) => a.ts - b.ts);
}

/** Bars per day implied by the resolution (e.g. 86400 => 1, 3600 => 24). */
export function barsPerDay(resolutionSec: number): number {
  const r = Math.max(1, resolutionSec);
  return 86400 / r;
}

/** Convert a trailing window in days into number of bars (rounded). */
export function windowBarsFromDays(windowDays: number, resolutionSec: number): number {
  const bpd = barsPerDay(resolutionSec);
  return Math.max(2, Math.round(Math.max(1, windowDays) * bpd));
}

/** Bars per year for annualization (crypto default: 365 days). */
export function barsPerYear(annualizationDays: number, resolutionSec: number): number {
  const bpd = barsPerDay(resolutionSec);
  return Math.max(1, annualizationDays) * bpd;
}

export function closesFromCandles(candles: OhlcCandle[]): number[] {
  return sortCandlesAsc(candles)
    .map((c) => c.close)
    .filter(isNum);
}

export function realizedVolFromCloses(
  closes: number[],
  windowBars: number,
  periodsPerYear: number
): number | undefined {
  if (closes.length < windowBars + 1) return undefined;

  const tail = closes.slice(-(windowBars + 1));
  const rets: number[] = [];
  for (let i = 1; i < tail.length; i++) {
    const prev = tail[i - 1];
    const cur = tail[i];
    if (!isNum(prev) || !isNum(cur) || prev <= 0 || cur <= 0) continue;
    const r = Math.log(cur / prev);
    if (Number.isFinite(r)) rets.push(r);
  }
  if (rets.length < 2) return undefined;

  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const varSample =
    rets.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (rets.length - 1);

  const sd = Math.sqrt(Math.max(varSample, 0));
  return sd * Math.sqrt(Math.max(periodsPerYear, 1));
}

export function realizedVolFromCandles(
  candles: OhlcCandle[],
  windowDays: number,
  resolutionSec: number,
  annualizationDays: number
): number | undefined {
  const closes = closesFromCandles(candles);
  const wBars = windowBarsFromDays(windowDays, resolutionSec);
  const ppy = barsPerYear(annualizationDays, resolutionSec);
  return realizedVolFromCloses(closes, wBars, ppy);
}

export function parkinsonVolFromCandles(
  candles: OhlcCandle[],
  windowDays: number,
  resolutionSec: number,
  annualizationDays: number
): number | undefined {
  const sorted = sortCandlesAsc(candles);
  const wBars = windowBarsFromDays(windowDays, resolutionSec);
  const ppy = barsPerYear(annualizationDays, resolutionSec);

  if (sorted.length < wBars) return undefined;

  const tail = sorted.slice(-wBars);

  // Parkinson variance per bar: (1 / (4 ln 2)) * mean( ln(H/L)^2 )
  const k = 1 / (4 * Math.log(2));

  let sum = 0;
  let n = 0;

  for (const c of tail) {
    const h = isNum(c.high) ? c.high : c.close;
    const l = isNum(c.low) ? c.low : c.close;
    if (!isNum(h) || !isNum(l) || h <= 0 || l <= 0) continue;

    const x = Math.log(h / l);
    if (!Number.isFinite(x)) continue;

    sum += x * x;
    n++;
  }

  if (n < 2) return undefined;

  const varPerBar = k * (sum / n);
  const annVar = varPerBar * Math.max(1, ppy);

  return Math.sqrt(Math.max(0, annVar)); // decimal (0.40 => 40%)
}

// ---------------------------------------------------------------------------
// ATR (Wilder) helpers (OHLC-derived indicator)
//
// - periodBars: 14 for daily candles; if intraday, use 14*barsPerDay(resolutionSec)
// - windowDays -> periodBars helper: windowBarsFromDays(windowDays, resolutionSec)
// ---------------------------------------------------------------------------

export type AtrPoint = {
  ts: number;
  atr?: number; // ATR in price units
};

function atrHi(c: OhlcCandle): number {
  return isNum(c.high) ? c.high : c.close;
}
function atrLo(c: OhlcCandle): number {
  return isNum(c.low) ? c.low : c.close;
}

function normalizeCandles(candlesIn: OhlcCandle[]): OhlcCandle[] {
  return sortCandlesAsc(candlesIn).filter((c) => isNum(c.ts) && isNum(c.close));
}

/** Wilder True Range for cur candle, given prev close. */
export function trueRange(cur: OhlcCandle, prevClose: number): number {
  const h = atrHi(cur);
  const l = atrLo(cur);
  const r1 = h - l;
  const r2 = Math.abs(h - prevClose);
  const r3 = Math.abs(l - prevClose);
  return Math.max(r1, r2, r3);
}

/**
 * Compute ATR series (Wilder). Points before enough history will have atr undefined.
 * Output length matches the filtered/sorted candle list (ts preserved).
 */
export function computeAtrWilderSeries(
  candlesIn: OhlcCandle[],
  periodBars = 14
): AtrPoint[] {
  const candles = normalizeCandles(candlesIn);
  const n = candles.length;
  const p = Math.max(2, Math.floor(periodBars));

  const out: AtrPoint[] = candles.map((c) => ({ ts: c.ts }));
  if (n < p + 1) return out;

  // TR aligned to candle index i (computed from i-1 -> i), i>=1
  const tr: number[] = Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    tr[i] = trueRange(candles[i], candles[i - 1].close);
  }

  // Wilder smoothing uses running sums (not averages).
  // ATR = sumTR / periodBars
  let sumTR = 0;
  for (let i = 1; i <= p; i++) sumTR += tr[i];

  out[p].atr = sumTR / p;

  for (let i = p + 1; i < n; i++) {
    sumTR = sumTR - sumTR / p + tr[i];
    out[i].atr = sumTR / p;
  }

  return out;
}

/** Latest ATR value (Wilder) in price units. */
export function atrWilderLast(candlesIn: OhlcCandle[], periodBars = 14): number | undefined {
  const candles = normalizeCandles(candlesIn);
  const n = candles.length;
  const p = Math.max(2, Math.floor(periodBars));
  if (n < p + 1) return undefined;

  // seed sumTR from i=1..p
  let sumTR = 0;
  for (let i = 1; i <= p; i++) {
    sumTR += trueRange(candles[i], candles[i - 1].close);
  }

  let atr = sumTR / p;

  // smooth forward
  for (let i = p + 1; i < n; i++) {
    const tr = trueRange(candles[i], candles[i - 1].close);
    sumTR = sumTR - sumTR / p + tr;
    atr = sumTR / p;
  }

  return atr;
}

/** Latest ATR point (ts + atr). */
export function atrLatestFromCandles(
  candlesIn: OhlcCandle[],
  periodBars = 14
): AtrPoint | undefined {
  const series = computeAtrWilderSeries(candlesIn, periodBars);
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].atr != null) return series[i];
  }
  return undefined;
}

/** Convenience: windowDays -> periodBars via resolutionSec. */
export function atrWilderLastFromCandles(
  candles: OhlcCandle[],
  windowDays: number,
  resolutionSec: number
): number | undefined {
  const periodBars = windowBarsFromDays(windowDays, resolutionSec);
  return atrWilderLast(candles, periodBars);
}

/**
 * ATR% (normalized): ATR / lastClose
 * Returns decimal (0.02 => 2%).
 */
export function atrPercentLast(candlesIn: OhlcCandle[], periodBars = 14): number | undefined {
  const candles = normalizeCandles(candlesIn);
  if (candles.length === 0) return undefined;

  const lastClose = candles[candles.length - 1].close;
  if (!isNum(lastClose) || lastClose <= 0) return undefined;

  const atr = atrWilderLast(candles, periodBars);
  if (atr == null) return undefined;

  return atr / lastClose;
}

/** Convenience: ATR% using windowDays + resolutionSec. */
export function atrPercentLastFromCandles(
  candles: OhlcCandle[],
  windowDays: number,
  resolutionSec: number
): number | undefined {
  const periodBars = windowBarsFromDays(windowDays, resolutionSec);
  return atrPercentLast(candles, periodBars);
}


// ---------------------------------------------------------------------------
// ADX(14) helpers (Wilder).
// Returns series with optional fields until enough history exists.
// periodBars: 14 for daily candles; if you use intraday bars, pass 14*barsPerDay.
// ---------------------------------------------------------------------------

export type AdxPoint = {
  ts: number;
  atr?: number;     // ATR (Wilder), in price units
  diPlus?: number;  // +DI in %
  diMinus?: number; // -DI in %
  dx?: number;      // DX in %
  adx?: number;     // ADX in %
};

function hi(c: OhlcCandle): number {
  return isNum(c.high) ? c.high : c.close;
}
function lo(c: OhlcCandle): number {
  return isNum(c.low) ? c.low : c.close;
}

export function computeAdxSeries(candlesIn: OhlcCandle[], periodBars = 14): AdxPoint[] {
  const candles = sortCandlesAsc(candlesIn).filter((c) => isNum(c.ts) && isNum(c.close));
  const n = candles.length;

  const out: AdxPoint[] = candles.map((c) => ({ ts: c.ts }));
  if (n < periodBars + 1) return out;

  // TR / +DM / -DM aligned to candle index i (computed from i-1 -> i), i>=1
  const tr: number[] = Array(n).fill(0);
  const dmP: number[] = Array(n).fill(0);
  const dmM: number[] = Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    const curHigh = hi(cur);
    const curLow = lo(cur);
    const prevHigh = hi(prev);
    const prevLow = lo(prev);
    const prevClose = prev.close;

    const upMove = curHigh - prevHigh;
    const downMove = prevLow - curLow;

    dmP[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    dmM[i] = downMove > upMove && downMove > 0 ? downMove : 0;

    const r1 = curHigh - curLow;
    const r2 = Math.abs(curHigh - prevClose);
    const r3 = Math.abs(curLow - prevClose);
    tr[i] = Math.max(r1, r2, r3);
  }

  // Wilder smoothing uses running sums (not averages). We'll expose ATR = sumTR/period.
  let sumTR = 0;
  let sumDMP = 0;
  let sumDMM = 0;

  for (let i = 1; i <= periodBars; i++) {
    sumTR += tr[i];
    sumDMP += dmP[i];
    sumDMM += dmM[i];
  }

  // DI/DX available from index = periodBars onward
  const dxValues: Array<{ i: number; dx: number }> = [];

  const computeDiDx = (i: number) => {
    if (sumTR <= 0) return;

    const diPlus = 100 * (sumDMP / sumTR);
    const diMinus = 100 * (sumDMM / sumTR);
    const denom = diPlus + diMinus;
    const dx = denom > 0 ? (100 * Math.abs(diPlus - diMinus)) / denom : 0;

    out[i].atr = sumTR / periodBars;
    out[i].diPlus = diPlus;
    out[i].diMinus = diMinus;
    out[i].dx = dx;

    dxValues.push({ i, dx });
  };

  computeDiDx(periodBars);

  for (let i = periodBars + 1; i < n; i++) {
    // Wilder smoothing update
    sumTR = sumTR - sumTR / periodBars + tr[i];
    sumDMP = sumDMP - sumDMP / periodBars + dmP[i];
    sumDMM = sumDMM - sumDMM / periodBars + dmM[i];

    computeDiDx(i);
  }

  // ADX: first value = average of first periodBars DX values.
  // DX values start at i=periodBars. So first ADX lands at i = 2*periodBars - 1.
  const firstAdxIndex = 2 * periodBars - 1;
  if (dxValues.length < periodBars) return out;

  // compute initial ADX as mean of first periodBars DXs
  const initSlice = dxValues.slice(0, periodBars);
  let adx = initSlice.reduce((s, p) => s + p.dx, 0) / periodBars;

  const initI = initSlice[initSlice.length - 1].i; // should be firstAdxIndex (if enough candles)
  out[initI].adx = adx;

  // continue smoothing for remaining DX values after the initial block
  for (let k = periodBars; k < dxValues.length; k++) {
    const { i, dx } = dxValues[k];
    if (i < initI) continue;
    if (i === initI) continue;

    adx = (adx * (periodBars - 1) + dx) / periodBars;
    out[i].adx = adx;
  }

  return out;
}

export function adxLatestFromCandles(candles: OhlcCandle[], periodBars = 14): AdxPoint | undefined {
  const series = computeAdxSeries(candles, periodBars);
  for (let i = series.length - 1; i >= 0; i--) {
    const p = series[i];
    if (p.adx != null || p.diPlus != null || p.diMinus != null) return p;
  }
  return undefined;
}
