import { useCallback, useEffect, useState } from "react";
import { fetchDvolHistory } from "../services/deribit";

type DvolPoint = {
  ts: number;          // your existing code uses .ts, so we keep this
  close?: number;
  value?: number;
  dvol?: number;
  index?: number;
  // [key: string]: any; // optionally add this if you like
};

/** Helper: extract the numeric DVOL value from a history point. */
function getDvolValue(p: DvolPoint): number | undefined {
  if (!p) return undefined;

  if (typeof p.close === "number" && !Number.isNaN(p.close)) return p.close;
  if (typeof p.value === "number" && !Number.isNaN(p.value)) return p.value;
  if (typeof p.dvol === "number" && !Number.isNaN(p.dvol)) return p.dvol;
  if (typeof p.index === "number" && !Number.isNaN(p.index)) return p.index;

  return undefined;
}

/** Compute IVR (rank 0..100) and IVP (percentile 0..100) from DVOL history. */
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
      // Same call as before
      const rawHist = (await fetchDvolHistory(
        currency,
        400,
        86400
      )) as DvolPoint[];

      console.log("[DVOL sample]", rawHist[0]);

      if (!rawHist || rawHist.length === 0) {
        throw new Error("No DVOL history");
      }

      // Ensure ascending order by timestamp
      const hist = [...rawHist].sort((a, b) => a.ts - b.ts);

      const lastTs = hist[hist.length - 1].ts;
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const startTs = lastTs - oneYearMs;

      // Only keep last ~1y
      const window = hist.filter((p) => p.ts >= startTs);

      if (window.length === 0) {
        throw new Error("No DVOL data in 1y window");
      }

      const closes = window
        .map((p) => getDvolValue(p))
        .filter((v): v is number => typeof v === "number");

      if (closes.length === 0) {
        // This is the error you're seeing now: means the field name didn't match
        throw new Error("No DVOL closes in 1y window");
      }

      const current = closes[closes.length - 1];

      // ---- IV Rank (range-based) ----
      const lo = Math.min(...closes);
      const hi = Math.max(...closes);
      const span = hi - lo;

      let ivrRaw = 0;
      if (span > 0) {
        ivrRaw = ((current - lo) / span) * 100;
      }

      // ---- IV Percentile (time-below-based) ----
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

  // Auto-run once on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ivr, ivp, lastUpdated, loading, error, refresh };
}
