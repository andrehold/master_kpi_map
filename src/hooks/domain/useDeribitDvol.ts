// src/hooks/useDeribitDvol.ts
import { useCallback, useEffect, useState } from "react";
import { fetchDvolHistory } from "../../services/deribit";

/**
 * Fetches latest DVOL (in percent) and its timestamp using the DVOL history endpoint.
 * Keeps the same shape: { valuePct, lastUpdated, loading, error, refresh }.
 *
 * Notes:
 * - We request a small recent history window and take the last bar.
 * - DVOL is returned in percent (e.g., 45.8 for 45.8%).
 * - Service layer handles rate limiting, retries, and caching.
 */
export function useDeribitDvol(currency: "BTC" | "ETH" = "BTC") {
  const [valuePct, setValuePct] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Pull a short window (e.g., last 200 minutes) at 60s resolution; take the last candle.
      const hist = await fetchDvolHistory(currency, 200, 60);
      if (!hist.length) throw new Error("No DVOL data");
      const last = hist[hist.length - 1];
      setValuePct(last.closePct);
      setLastUpdated(last.ts);
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch DVOL");
    } finally {
      setLoading(false);
    }
  }, [currency]);

  // Auto-run once on mount
  useEffect(() => { refresh(); }, [refresh]);

  return { valuePct, lastUpdated, loading, error, refresh };
}