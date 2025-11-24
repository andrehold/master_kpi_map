import { useCallback, useEffect, useState } from "react";
import { fetchDvolHistory } from "../services/deribit";

type DvolPoint = {
  ts: number;
  closePct?: number;
  openPct?: number;
  highPct?: number;
  lowPct?: number;
  // keep some fallbacks in case fetchDvolHistory changes later
  close?: number;
  value?: number;
};

/** Helper: extract the numeric DVOL value from a history point. */
function getDvolValue(p: DvolPoint): number | undefined {
  if (!p) return undefined;

  // Your sample shows closePct as the main field
  if (typeof p.closePct === "number" && !Number.isNaN(p.closePct)) return p.closePct;

  // Fallbacks, in case the shape changes in future
  if (typeof p.close === "number" && !Number.isNaN(p.close)) return p.close;
  if (typeof p.value === "number" && !Number.isNaN(p.value)) return p.value;
  if (typeof p.openPct === "number" && !Number.isNaN(p.openPct)) return p.openPct;

  return undefined;
}

/**
 * Compute IV Rank (IVR, 0–100) and IV Percentile (IVP, 0–100)
 * from DVOL history, following Deribit's definitions.
 */
export function useIvrFromDvol(currency: "BTC" | "ETH" = "BTC") {
  const [ivr, setIvr] = useState<number | null>(null);
  const [ivp, setIvp] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 400 daily points ≈ 400 days of DVOL
      const rawHist = (await fetchDvolHistory(
        currency,
        400,
        86400
      )) as DvolPoint[];

      if (!rawHist || rawHist.length === 0) {
        throw new Error("No DVOL history");
      }

      // Ensure ascending order by timestamp
      const hist = [...rawHist].sort((a, b) => a.ts - b.ts);

      const lastTs = hist[hist.length - 1].ts;
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const startTs = lastTs - oneYearMs;

      // Only use last ~1 year of data to match Deribit
      const window = hist.filter((p) => p.ts >= startTs);

      if (window.length === 0) {
        throw new Error("No DVOL data in 1y window");
      }

      const closes = window
        .map((p) => getDvolValue(p))
        .filter((v): v is number => typeof v === "number");

      if (closes.length === 0) {
        // Helpful debug if this ever breaks again
        console.warn("[useIvrFromDvol] no usable DVOL values, sample point:", window[0]);
        throw new Error("No usable DVOL values in 1y window");
      }

      const current = closes[closes.length - 1];

      // ---- IV Rank: position between 1y min & max ----
      const lo = Math.min(...closes);
      const hi = Math.max(...closes);
      const span = hi - lo;

      let ivrRaw = 0;
      if (span > 0) {
        ivrRaw = ((current - lo) / span) * 100;
      }

      // ---- IV Percentile: share of periods with lower IV ----
      const periodsLower = closes.filter((v) => v < current).length;
      const pct = (periodsLower / closes.length) * 100;

      const clamp01 = (x: number) => Math.max(0, Math.min(100, x));

      setIvr(clamp01(Math.round(ivrRaw)));
      setIvp(clamp01(Math.round(pct)));
      setLastUpdated(lastTs);
    } catch (e: any) {
      console.error("[useIvrFromDvol] error:", e);
      setError(e?.message ?? "Failed to compute IVR/IVP");
      setIvr(null);
      setIvp(null);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  // Auto-run on mount & whenever currency changes
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ivr, ivp, lastUpdated, loading, error, refresh };
}
