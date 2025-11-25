// src/hooks/domain/useGammaWalls.ts
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  getIndexPrice,
  getInstruments,
  getTicker,
  getBookSummaryByCurrency,
} from "../../services/deribit";

export type GammaByStrike = {
  strike: number;
  gex_call_usd: number;
  gex_put_usd: number;
  gex_net_usd: number;
  gex_abs_usd: number;
};

export function useGammaWalls(opts?: {
  currency?: "BTC" | "ETH";
  windowPct?: number;
  topN?: number;
  pollMs?: number;
  enabled?: boolean;
}) {
  const { 
    currency = "BTC", 
    windowPct = 0.10, 
    topN = 3, 
    pollMs = 30000, 
    enabled = true 
  } = opts || {};

  const [data, setData] = useState<GammaByStrike[] | null>(null);
  const [indexPrice, setIndexPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // ✅ Stable fetch function stored in ref
  const fetchRef = useRef<() => Promise<void>>();
  
  fetchRef.current = useCallback(async () => {
    if (!enabled || !mountedRef.current) {
      setLoading(false);
      return;
    }

    // Only show loading on initial load, not on refreshes
    setLoading(prev => data === null ? true : prev);
    setError(null);

    try {
      const [spot, instruments, oiMap] = await Promise.all([
        getIndexPrice(currency),
        getInstruments(currency),
        getBookSummaryByCurrency(currency),
      ]);

      if (!mountedRef.current) return;

      setIndexPrice(spot);

      const near = instruments.filter(
        (i: any) =>
          i?.kind === "option" &&
          typeof i.strike === "number" &&
          isFinite(i.strike) &&
          Math.abs(i.strike - spot) / spot <= windowPct
      );

      const rows = await Promise.all(
        near.map(async (i: any) => {
          const t = await getTicker(i.instrument_name);
          const gamma = t?.greeks?.gamma;
          const oi = oiMap.get(i.instrument_name) ?? 0;
          return {
            strike: i.strike as number,
            isCall: i.option_type === "call",
            gamma: typeof gamma === "number" ? gamma : null,
            oi: typeof oi === "number" ? oi : 0,
          };
        })
      );

      if (!mountedRef.current) return;

      const byStrike = new Map<number, { call: number; put: number }>();
      
      for (const r of rows) {
        if (!(r.gamma && r.oi > 0)) continue;
        const usdGamma = r.gamma * spot * spot * r.oi;
        const prev = byStrike.get(r.strike) ?? { call: 0, put: 0 };
        if (r.isCall) prev.call += usdGamma;
        else prev.put += usdGamma;
        byStrike.set(r.strike, prev);
      }

      const out: GammaByStrike[] = [];
      for (const [strike, { call, put }] of byStrike) {
        const net = call - put;
        out.push({
          strike,
          gex_call_usd: call,
          gex_put_usd: put,
          gex_net_usd: net,
          gex_abs_usd: Math.abs(net),
        });
      }

      out.sort((a, b) => {
        if (b.gex_abs_usd !== a.gex_abs_usd) return b.gex_abs_usd - a.gex_abs_usd;
        return Math.abs(a.strike - spot) - Math.abs(b.strike - spot);
      });

      if (!mountedRef.current) return;
      setData(out);
      setError(null);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e?.message ?? "Failed to build gamma walls");
      setData(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, currency, windowPct, data]); // ✅ Include data to check initial state

  // ✅ Single effect with stable dependencies
  useEffect(() => {
    mountedRef.current = true;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Initial fetch
    fetchRef.current?.();

    // Setup polling only if enabled and pollMs > 0
    if (enabled && pollMs > 0) {
      timerRef.current = setInterval(() => {
        fetchRef.current?.();
      }, pollMs);
    }

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, pollMs, currency, windowPct]); // ✅ Only primitives

  const top = useMemo(() => {
    if (!data) return null;
    return data.slice(0, topN);
  }, [data, topN]);

  const refresh = useCallback(() => {
    fetchRef.current?.();
  }, []);

  return { 
    data, 
    top, 
    indexPrice, 
    loading, 
    error, 
    refresh,
    // Add walls alias for backward compatibility if needed
    walls: data,
  };
}