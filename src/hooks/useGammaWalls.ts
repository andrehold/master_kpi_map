// src/hooks/useGammaWalls.ts
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getIndexPrice,
  getInstruments,
  getTicker,
  getBookSummaryByCurrency,
} from "../services/deribit";

export type GammaByStrike = {
  strike: number;
  gex_call_usd: number;
  gex_put_usd: number;
  gex_net_usd: number;
  gex_abs_usd: number;
};

export function useGammaWalls(opts?: {
  currency?: "BTC" | "ETH";
  windowPct?: number;   // strikes within ±(windowPct) of spot
  topN?: number;        // how many walls to surface for badges
  pollMs?: number;      // 0 = no polling
  enabled?: boolean;
}) {
  const { currency = "BTC", windowPct = 0.10, topN = 3, pollMs = 30000, enabled = true } = opts;

  const [data, setData] = useState<GammaByStrike[] | null>(null);
  const [indexPrice, setIndexPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function run() {
    if (!enabled) return;
    setLoading(prev => (data ? prev : true));
    setError(null);
    try {
      const [spot, instruments, oiMap] = await Promise.all([
        getIndexPrice(currency),
        getInstruments(currency),
        getBookSummaryByCurrency(currency),
      ]);
      setIndexPrice(spot);

      const near = instruments.filter(
        (i: any) =>
          i?.kind === "option" &&
          typeof i.strike === "number" &&
          isFinite(i.strike) &&
          Math.abs(i.strike - spot) / spot <= windowPct
      );

      // get gamma via ticker per instrument (your deribit.ts rate-gate will coalesce)
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

      // aggregate gamma exposure to USD per strike: gamma * S^2 * OI * contractSize(=1)
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
        const net = call - put; // sign convention: calls – puts
        out.push({
          strike,
          gex_call_usd: call,
          gex_put_usd: put,
          gex_net_usd: net,
          gex_abs_usd: Math.abs(net),
        });
      }

      // sort by |GEX| descending, then by proximity to spot
      out.sort((a, b) => {
        if (b.gex_abs_usd !== a.gex_abs_usd) return b.gex_abs_usd - a.gex_abs_usd;
        return Math.abs(a.strike - spot) - Math.abs(b.strike - spot);
      });

      setData(out);
    } catch (e: any) {
      setError(e?.message ?? "Failed to build gamma walls");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Always fetch once on mount/options change
    run();

    // Only set up polling when pollMs > 0
    if (enabled && pollMs > 0) {
      timerRef.current = setInterval(run, pollMs);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [run, enabled, pollMs]);

  const top = useMemo(() => {
    if (!data) return null;
    return data.slice(0, topN);
  }, [data, topN]);

  return { data, top, indexPrice, loading, error, refresh: run };
}
