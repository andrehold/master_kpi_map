import { useCallback, useState } from "react";
import { fetchDvolHistory } from "../services/deribit";

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
      const hist = await fetchDvolHistory(currency, 400, 86400);
      if (!hist.length) throw new Error("No DVOL history");

      const closes = hist.map(h => h.closePct);
      const current = closes[closes.length - 1];
      const lo = Math.min(...closes);
      const hi = Math.max(...closes);

      // IV Rank: where today's IV sits within 52w high/low range
      const rank = hi === lo ? 0 : ((current - lo) / (hi - lo)) * 100;

      // IV Percentile: % of values below current
      const pct = (closes.filter(v => v < current).length / closes.length) * 100;

      setIvr(Math.max(0, Math.min(100, Math.round(rank))));
      setIvp(Math.max(0, Math.min(100, Math.round(pct))));
      setLastUpdated(hist[hist.length - 1].ts);
    } catch (e: any) {
      setError(e?.message ?? "Failed to compute IVR");
    } finally {
      setLoading(false);
    }
  }, [currency]);

  return { ivr, ivp, lastUpdated, loading, error, refresh };
}
