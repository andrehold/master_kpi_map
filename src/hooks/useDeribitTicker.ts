import { useCallback, useEffect, useRef, useState } from "react";
import { getTicker, type DeribitTicker } from "../services/deribit";

/** Try mark_price -> mid(bid/ask) -> last_price. */
export function midFromTicker(t?: DeribitTicker | null): number | null {
  if (!t) return null;

  // Some Deribit responses include mark_price but it's not in your current type.
  // We read it defensively via `as any` so no type change is required.
  const mark = (t as any)?.mark_price;
  if (typeof mark === "number" && Number.isFinite(mark)) return mark;

  const { best_bid_price: bid, best_ask_price: ask, last_price: last } = t;

  if (typeof bid === "number" && typeof ask === "number" && Number.isFinite(bid) && Number.isFinite(ask)) {
    return (bid + ask) / 2;
  }
  if (typeof last === "number" && Number.isFinite(last)) return last;

  return null;
}

export function useDeribitTicker(instrument_name: string, pollMs = 15_000) {
  const [ticker, setTicker] = useState<DeribitTicker | null>(null);
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await getTicker(instrument_name);
      setTicker(t);
      setMidPrice(midFromTicker(t));
      setLastUpdated(Date.now());
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [instrument_name]);

  useEffect(() => {
    refresh();
    if (pollMs > 0) {
      timerRef.current = window.setInterval(refresh, pollMs);
      return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }
  }, [refresh, pollMs]);

  return { ticker, midPrice, lastUpdated, loading, error, refresh };
}
