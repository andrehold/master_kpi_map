import { emAbsFromSpotIv } from "../../lib/expectedMoveMath";

interface DailyIv {
    ts: number;
    closePct: number;   // annualized IV in percent
  }
  
  interface DailyClose {
    ts: number;
    close: number;
  }
  
  export interface ExpectedMoveHitRateResult {
    hitRatePct: number;
    total: number;
    hits: number;
    misses: number;
  }
  
  export function computeExpectedMoveHitRate(
    ivSeries: DailyIv[],
    priceSeries: DailyClose[],
    opts: { horizonDays: number; lookbackDays: number }
  ): ExpectedMoveHitRateResult {
    const { horizonDays, lookbackDays } = opts;
  
    // 1) index price by day (ts) – you might already have a helper to align
    const byDay = new Map<number, { spot: number; ivPct: number }>();
  
    // simplistic alignment: assume both series are daily and near-same ts
    ivSeries.forEach(iv => {
      byDay.set(iv.ts, { spot: NaN, ivPct: iv.closePct });
    });
  
    priceSeries.forEach(p => {
      const existing = byDay.get(p.ts) ?? { spot: NaN, ivPct: NaN };
      byDay.set(p.ts, { ...existing, spot: p.close });
    });
  
    const entries = Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-lookbackDays - 1); // need +1 for next-day move
  
    let hits = 0;
    let total = 0;
  
    for (let i = 0; i < entries.length - 1; i++) {
      const [ts, { spot, ivPct }] = entries[i];
      const [, { spot: nextSpot }] = entries[i + 1];
  
      if (!isFinite(spot) || !isFinite(ivPct) || !isFinite(nextSpot)) continue;
  
      // 1) expected move for chosen horizon (1D or 7D)
      const iv = ivPct / 100;
      const em = emAbsFromSpotIv(spot, iv, horizonDays);
  
      // 2) realized move
      const rm = Math.abs(nextSpot - spot);
  
      total += 1;
      if (rm <= em) hits += 1;
    }
  
    const hitRatePct = total > 0 ? (hits / total) * 100 : NaN;
  
    return {
      hitRatePct,
      total,
      hits,
      misses: total - hits,
    };
  }
  