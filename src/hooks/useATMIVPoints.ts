// src/hooks/useATMIVPoints.ts
import { useEffect, useRef, useState } from "react";
import { getInstruments, getIndexPrice, getTicker, type DeribitInstrument } from "../services/deribit";

export type UseATMIVPointsOptions = {
  currency?: "BTC" | "ETH";
  maxExpiries?: number;  // how many upcoming expiries to include
  bandPct?: number;      // ± band around spot for candidate strikes (not strictly needed now, but kept for API compat)
  minDteHours?: number;  // skip expiries expiring within N hours (default 12)
  refreshMs?: number;    // polling interval; 0 = no polling
};

export type IVPoint = {
  expiryTs: number;      // ms since epoch
  expiryISO: string;     // YYYY-MM-DD
  dteDays: number;       // days to expiry
  iv: number;            // ATM IV in decimal (e.g., 0.455 => 45.5%)
  strikeCall?: number;   // strike of the selected call (nearest to ATM)
  strikePut?: number;    // strike of the selected put (nearest to ATM)
  callName?: string;     // instrument name used on the call side (if any)
  putName?: string;      // instrument name used on the put side (if any)
};

type State = {
  asOf: string;
  currency: "BTC" | "ETH";
  indexPrice: number;
  points: IVPoint[];
};

const DEFAULTS = {
  currency: "BTC" as const,
  maxExpiries: 6,
  minDteHours: 12,
};

/**
 * Normalize Deribit mark_iv to decimal
 * - Sometimes returned as 45.8 (percent), sometimes as 0.458 (decimal)
 */
function asDecimalIv(x?: number) {
  if (typeof x !== "number" || !isFinite(x)) return undefined;
  return x > 1 ? x / 100 : x;
}

export function useATMIVPoints(opts: UseATMIVPointsOptions = {}) {
  const {
    currency = DEFAULTS.currency,
    maxExpiries = DEFAULTS.maxExpiries,
    // bandPct is currently unused; selection is by nearest-to-spot strike per side.
    minDteHours = DEFAULTS.minDteHours,
    refreshMs = 0,
  } = opts;

  const [data, setData] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const timer = useRef<number | null>(null);

  async function run(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(undefined);

      const [instruments, spot] = await Promise.all([
        getInstruments(currency),
        getIndexPrice(currency),
      ]);

      const now = Date.now();
      // Group options by expiry
      const groups = new Map<number, DeribitInstrument[]>();
      for (const ins of instruments) {
        if (ins.kind !== "option" || !ins.is_active) continue;
        const tteHours = (ins.expiration_timestamp - now) / 36e5;
        if (tteHours <= minDteHours) continue;
        const arr = groups.get(ins.expiration_timestamp) ?? [];
        arr.push(ins);
        if (!groups.has(ins.expiration_timestamp)) groups.set(ins.expiration_timestamp, arr);
      }

      // Take next N expiries sorted by time
      const expiries = Array.from(groups.keys()).sort((a, b) => a - b).slice(0, Math.max(1, maxExpiries));

      const points: IVPoint[] = [];
      for (const ts of expiries) {
        const series = groups.get(ts)!;
        const dteDays = (ts - now) / 86400e3;
        const expiryISO = new Date(ts).toISOString().slice(0, 10);

        // Split by side and pick the nearest-to-spot strike for each
        const calls = series.filter(i => i.option_type === "call" && typeof i.strike === "number");
        const puts  = series.filter(i => i.option_type === "put"  && typeof i.strike === "number");

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

        // Fetch at most two tickers per expiry — service-level limiter & cache handle rate limits.
        if (call) {
          const tk = await getTicker(call.instrument_name);
          ivC = asDecimalIv(tk?.mark_iv);
          callName = call.instrument_name;
          strikeCall = call.strike;
        }
        if (put) {
          const tk = await getTicker(put.instrument_name);
          ivP = asDecimalIv(tk?.mark_iv);
          putName = put.instrument_name;
          strikePut = put.strike;
        }

        // Compose ATM IV — average of call & put if both present; else whichever is present.
        let atmIv: number | undefined;
        if (typeof ivC === "number" && typeof ivP === "number") {
          atmIv = (ivC + ivP) / 2;
        } else if (typeof ivC === "number") {
          atmIv = ivC;
        } else if (typeof ivP === "number") {
          atmIv = ivP;
        }

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

      const payload: State = {
        asOf: new Date().toISOString(),
        currency,
        indexPrice: spot,
        points,
      };

      setData(payload);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || String(e));
      setLoading(false);
    }
  }

  useEffect(() => {
    const ctl = new AbortController();
    run(ctl.signal);
    return () => ctl.abort();
  }, [currency, maxExpiries, minDteHours]);

  // Lightweight polling (optional)
  useEffect(() => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    if (refreshMs > 0) {
      timer.current = window.setInterval(() => {
        const ctl = new AbortController();
        run(ctl.signal);
      }, refreshMs) as unknown as number;
    }
    return () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; };
  }, [refreshMs, currency, maxExpiries, minDteHours]);

  const reload = () => run();

  return { data, loading, error, reload };
}