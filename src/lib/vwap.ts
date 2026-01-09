export type Candle = {
    ts: number;          // ms
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;      // must be real traded volume
  };
  
  export type AnchorMode = "swing" | "month_open" | "event";
  
  export function typicalPrice(c: Candle) {
    return (c.high + c.low + c.close) / 3;
  }
  
  export function computeVwapFrom(candles: Candle[], startIndex: number) {
    let pv = 0;
    let v = 0;
    for (let i = startIndex; i < candles.length; i++) {
      const c = candles[i];
      if (!Number.isFinite(c.volume) || c.volume <= 0) continue;
      pv += typicalPrice(c) * c.volume;
      v += c.volume;
    }
    if (v <= 0) return null;
    return pv / v;
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
  
  export function computeSessionVwapTodayBerlin(candles: Candle[], nowTsMs: number) {
    const todayKey = dayKeyBerlin(nowTsMs);
    const startIndex = candles.findIndex((c) => dayKeyBerlin(c.ts) === todayKey);
    if (startIndex < 0) return null;
    return computeVwapFrom(candles, startIndex);
  }
  
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
  
  /** Last pivot high/low in the lookback window; returns the most recent pivot */
  export function findLastSwingPivot(
    candles: Candle[],
    opts?: { left?: number; right?: number; lookbackCandles?: number }
  ): { index: number; kind: "high" | "low" } | null {
    const left = opts?.left ?? 3;
    const right = opts?.right ?? 3;
    const lookback = opts?.lookbackCandles ?? Math.min(candles.length, 400); // ~ depends on TF
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
  
  export function findEventCandleIndex(
    candles: Candle[],
    nowTsMs: number,
    lookbackDays = 14
  ) {
    const cutoff = nowTsMs - lookbackDays * 24 * 60 * 60 * 1000;
    let bestIdx = -1;
    let bestScore = -Infinity;
  
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.ts < cutoff) continue;
      const range = Math.max(0, c.high - c.low);
      const score = range * (Number.isFinite(c.volume) ? c.volume : 0);
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
  