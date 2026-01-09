export type VwapCandle = {
    ts: number;              // ms
    open?: number;
    high?: number;
    low?: number;
    close: number;
    volume?: number;
};

export type AnchorMode = "swing" | "month_open" | "event";

function isNum(x: unknown): x is number {
    return typeof x === "number" && Number.isFinite(x);
}

function op(c: VwapCandle): number {
    return isNum(c.open) ? c.open : c.close;
}
function hi(c: VwapCandle): number {
    return isNum(c.high) ? c.high : c.close;
}
function lo(c: VwapCandle): number {
    return isNum(c.low) ? c.low : c.close;
}
function vol(c: VwapCandle): number | undefined {
    return isNum(c.volume) ? c.volume : undefined;
}

export function typicalPrice(c: VwapCandle) {
    return (hi(c) + lo(c) + c.close) / 3;
  }

/**
 * VWAP from startIndex to end (inclusive).
 * - weight="volume": true VWAP if volume exists; returns null if volume missing/zero across window
 * - weight="equal": equal-weight fallback (TWAP-ish on typical price)
 */
export function computeVwapFrom(
    candles: VwapCandle[],
    startIndex: number,
    opts?: { endIndex?: number; weight?: "volume" | "equal" }
  ) {
    const endIndex = opts?.endIndex ?? (candles.length - 1);
    const weight = opts?.weight ?? "volume";
  
    let pv = 0;
    let wSum = 0;
    let sawAny = false;
    let sawAnyVolume = false;
  
    for (let i = startIndex; i <= endIndex; i++) {
      const c = candles[i];
      if (!c) continue;
  
      const tp = typicalPrice(c);
      if (!Number.isFinite(tp)) continue;
  
      sawAny = true;
  
      if (weight === "volume") {
        const v = vol(c);
        if (!v || v <= 0) continue;
        sawAnyVolume = true;
        pv += tp * v;
        wSum += v;
      } else {
        pv += tp;
        wSum += 1;
      }
    }
  
    if (!sawAny) return null;
    if (weight === "volume" && !sawAnyVolume) return null;
    if (wSum <= 0) return null;
  
    return pv / wSum;
  }
  
  /** Berlin day key YYYY-MM-DD (stable + sortable) */
  const fmtBerlinDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  export function dayKeyBerlin(tsMs: number) {
    return fmtBerlinDay.format(new Date(tsMs));
  }
  
  const fmtBerlinMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
  });
  export function monthKeyBerlin(tsMs: number) {
    return fmtBerlinMonth.format(new Date(tsMs)); // YYYY-MM
  }
  
  export function computeSessionVwapTodayBerlin(candles: VwapCandle[], nowTsMs: number) {
    const todayKey = dayKeyBerlin(nowTsMs);
    const startIndex = candles.findIndex((c) => dayKeyBerlin(c.ts) === todayKey);
    if (startIndex < 0) return null;
    return computeVwapFrom(candles, startIndex, { weight: "volume" });
  }
  
  function isPivotHigh(candles: VwapCandle[], i: number, left: number, right: number) {
    const h = hi(candles[i]);
    for (let k = i - left; k <= i + right; k++) {
      if (k === i) continue;
      if (k < 0 || k >= candles.length) return false;
      if (hi(candles[k]) >= h) return false;
    }
    return true;
  }
  
  function isPivotLow(candles: VwapCandle[], i: number, left: number, right: number) {
    const l = lo(candles[i]);
    for (let k = i - left; k <= i + right; k++) {
      if (k === i) continue;
      if (k < 0 || k >= candles.length) return false;
      if (lo(candles[k]) <= l) return false;
    }
    return true;
  }
  
  /** Last pivot high/low in lookback; returns most recent pivot */
  export function findLastSwingPivot(
    candles: VwapCandle[],
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
  
  export function findMonthOpenIndex(candles: VwapCandle[], nowTsMs: number) {
    const curMonth = monthKeyBerlin(nowTsMs);
    return candles.findIndex((c) => monthKeyBerlin(c.ts) === curMonth);
  }
  
  /**
   * “Event candle”: highest (range × volume) score in lookback.
   * If volume is missing, it degrades to just range.
   */
  export function findEventCandleIndex(candles: VwapCandle[], nowTsMs: number, lookbackDays = 14) {
    const cutoff = nowTsMs - lookbackDays * 24 * 60 * 60 * 1000;
    let bestIdx = -1;
    let bestScore = -Infinity;
  
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.ts < cutoff) continue;
  
      const range = Math.max(0, hi(c) - lo(c));
      const v = vol(c) ?? 1;
      const score = range * v;
  
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx >= 0 ? bestIdx : null;
  }
  
  export function pctDistance(spot: number, ref: number) {
    if (!Number.isFinite(spot) || !Number.isFinite(ref) || ref === 0) return null;
    return ((spot - ref) / ref) * 100;
  }