import { useCallback, useEffect, useRef, useState } from "react";
import { getIndexPriceMeta } from "../../services/deribit";

export function useDeribitIndexPrice(currency: "BTC" | "ETH", pollMs = 15000) {
  const [price, setPrice] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { price, timestamp } = await getIndexPriceMeta(currency);
      setPrice(price);
      setLastUpdated(timestamp);
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch index price");
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    refresh();
    if (pollMs > 0) {
      timerRef.current = window.setInterval(refresh, pollMs);
      return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }
  }, [refresh, pollMs]);

  return { price, lastUpdated, loading, error, refresh };
}
