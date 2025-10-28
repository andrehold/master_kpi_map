import { useCallback, useState } from "react";
import { fetchDvolLatest } from "../services/deribit";

export function useDeribitDvol(currency: "BTC" | "ETH" = "BTC") {
  const [valuePct, setValuePct] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { valuePct, ts } = await fetchDvolLatest(currency, "60");
      setValuePct(valuePct);
      setLastUpdated(ts);
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch DVOL");
    } finally {
      setLoading(false);
    }
  }, [currency]);

  return { valuePct, lastUpdated, loading, error, refresh };
}
