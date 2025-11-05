// src/hooks/useIVTermStructure.ts
import { useEffect, useRef, useState } from "react";
import { getInstruments, getIndexPrice, getTicker, type DeribitInstrument } from "../services/deribit";
import { getTermStructureStats, type IVTermStructureLabel } from "../lib/ivTerm";

export type UseIVTermStructureOptions = {
  currency?: "BTC" | "ETH";
  maxExpiries?: number;
  bandPct?: number;     // optional: restrict candidate strikes to ±bandPct of spot
  minDteHours?: number; // skip expiries expiring within N hours (default 12)
  refreshMs?: number;   // polling interval; 0 = no polling
};

export type IVPoint = {
  expiryTs: number;
  expiryISO: string;
  dteDays: number;
  iv: number;           // decimal (e.g., 0.458 => 45.8%)
  strikeCall?: number;
  strikePut?: number;
  callName?: string;
  putName?: string;
};

type State = {
  asOf: string;
  currency: "BTC" | "ETH";
  indexPrice: number;
  points: IVPoint[];

  // computed stats
  n: number;
  slopePerYear: number | null;
  termPremium: number | null;
  label: IVTermStructureLabel;
};

function asDecimalIv(x?: number) {
  if (typeof x !== "number" || !isFinite(x)) return undefined;
  return x > 1 ? x / 100 : x;
}

export function useIVTermStructure(options: UseIVTermStructureOptions = {}) {
  const {
    currency = "BTC",
    maxExpiries = 6,
    bandPct,
    minDteHours = 12,
    refreshMs = 0,
  } = options;

  const [data, setData] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const run = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      // 1) fetch instruments + index (service layer is rate-limited & cached)
      const [instruments, spot] = await Promise.all([
        getInstruments(currency),
        getIndexPrice(currency),
      ]);

      if (signal?.aborted) return;

      const now = Date.now();
      // 2) group by expiry and filter out near-expiry contracts
      const groups = new Map<number, DeribitInstrument[]>();
      for (const ins of instruments) {
        if (ins.kind !== "option" || !ins.is_active) continue;
        const tteHours = (ins.expiration_timestamp - now) / 36e5;
        if (tteHours <= minDteHours) continue;
        const arr = groups.get(ins.expiration_timestamp) ?? [];
        arr.push(ins);
        if (!groups.has(ins.expiration_timestamp)) groups.set(ins.expiration_timestamp, arr);
      }

      // 3) choose next expiries in time order
      // 3) choose expiries (prefer last-in-month — e.g., monthly over earlier weeklies)
      const sorted = Array.from(groups.keys()).sort((a, b) => a - b);

      // collapse to last expiry per calendar month (UTC)
      const byMonth = new Map<string, number>();
      for (const ts of sorted) {
        const d = new Date(ts);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        const prev = byMonth.get(key);
        if (prev == null || ts > prev) byMonth.set(key, ts); // keep latest in that month
      }

      // take earliest N months
      const expiries = Array.from(byMonth.values())
        .sort((a, b) => a - b)
        .slice(0, Math.max(1, maxExpiries));

      const points: IVPoint[] = [];

      for (const ts of expiries) {
        const series = groups.get(ts)!;
        const dteDays = (ts - now) / 86400e3;
        const expiryISO = new Date(ts).toISOString().slice(0, 10);

        let calls = series.filter(i => i.option_type === "call" && typeof i.strike === "number");
        let puts  = series.filter(i => i.option_type === "put"  && typeof i.strike === "number");

        if (typeof bandPct === "number" && bandPct > 0 && isFinite(bandPct)) {
          const lo = spot * (1 - bandPct);
          const hi = spot * (1 + bandPct);
          calls = calls.filter(i => (i.strike! >= lo && i.strike! <= hi));
          puts  = puts.filter (i => (i.strike! >= lo && i.strike! <= hi));
        }

        // Sort by distance to spot and take nearest on each side
        calls.sort((a, b) => Math.abs((a.strike! - spot)) - Math.abs((b.strike! - spot)));
        puts.sort ((a, b) => Math.abs((a.strike! - spot)) - Math.abs((b.strike! - spot)));

        const call = calls[0];
        const put  = puts[0];

        let ivC: number | undefined;
        let ivP: number | undefined;
        let callName: string | undefined;
        let putName: string | undefined;
        let strikeCall: number | undefined;
        let strikePut: number | undefined;

        // 4) fetch at most two tickers per expiry (global limiter handles rate)
        if (call) {
          const tk = await getTicker(call.instrument_name);
          if (signal?.aborted) return;
          ivC = asDecimalIv(tk?.mark_iv);
          callName = call.instrument_name;
          strikeCall = call.strike;
        }
        if (put) {
          const tk = await getTicker(put.instrument_name);
          if (signal?.aborted) return;
          ivP = asDecimalIv(tk?.mark_iv);
          putName = put.instrument_name;
          strikePut = put.strike;
        }

        // 5) ATM IV per expiry = average of call/put IVs (fallback to whichever exists)
        let atmIv: number | undefined;
        if (typeof ivC === "number" && typeof ivP === "number") atmIv = (ivC + ivP) / 2;
        else if (typeof ivC === "number") atmIv = ivC;
        else if (typeof ivP === "number") atmIv = ivP;

        if (typeof atmIv === "number" && isFinite(atmIv)) {
          points.push({
            expiryTs: ts,
            expiryISO,
            dteDays,
            iv: atmIv,
            strikeCall,
            strikePut,
            callName,
            putName,
          });
        }
      }

      // 6) compute stats (pure utils — no fetching)
      const { n, slopePerYear, termPremium, label } = getTermStructureStats(points);

      if (!signal?.aborted) {
        setData({
          asOf: new Date().toISOString(),
          currency,
          indexPrice: spot,
          points,
          n,
          slopePerYear,
          termPremium,
          label,
        });
      }
    } catch (e: any) {
      if (!signal?.aborted) setError(e?.message ?? "Failed to load IV term structure");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ctl = new AbortController();
    run(ctl.signal);
    return () => ctl.abort();
  }, [currency, maxExpiries, bandPct, minDteHours]);

  // optional polling (mind Deribit limits)
  useEffect(() => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    if (refreshMs > 0) {
      timer.current = window.setInterval(() => {
        const ctl = new AbortController();
        run(ctl.signal);
      }, refreshMs) as unknown as number;
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [refreshMs, currency, maxExpiries, bandPct, minDteHours]);

  const reload = () => run();

  return { data, loading, error, reload };
}
