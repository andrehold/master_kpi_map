// src/hooks/useATMIVPoints.ts
import { useEffect, useRef, useState } from "react";
import { buildAtmIvPoints, type IVPoint } from "../lib/atmIv";

export type UseATMIVPointsOptions = {
  currency?: "BTC" | "ETH";
  maxExpiries?: number;  // how many upcoming expiries to include
  bandPct?: number;      // ± band around spot for candidate strikes
  minDteHours?: number;  // skip expiries expiring within N hours (default 12)
  nearDays?: number;     // passthrough to curated expiry selection
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
  indexPrice: number | null;
  points: IVPoint[];
};

const DEFAULTS = {
  currency: "BTC" as const,
  maxExpiries: 6,
  minDteHours: 12,
};

export function useATMIVPoints(opts: UseATMIVPointsOptions = {}) {
  const {
    currency = DEFAULTS.currency,
    maxExpiries = DEFAULTS.maxExpiries,
    bandPct = 0,
    minDteHours = DEFAULTS.minDteHours,
    nearDays = 14,
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

      const { asOf, indexPrice, points } = await buildAtmIvPoints({
        currency,
        maxExpiries,
        minDteHours,
        bandPct,
        nearDays,
        signal,
      });

      const payload: State = {
        asOf: new Date(asOf).toISOString(),
        currency,
        indexPrice,
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
  }, [currency, maxExpiries, minDteHours, bandPct, nearDays]);

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
  }, [refreshMs, currency, maxExpiries, minDteHours, bandPct, nearDays]);

  const reload = () => run();

  return { data, loading, error, reload };
}