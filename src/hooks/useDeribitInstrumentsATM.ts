// src/hooks/useDeribitInstrumentsATM.ts
import { useEffect, useRef, useState } from "react";
import { getInstruments, getIndexPrice, type DeribitInstrument } from "../services/deribit";

export type Group = {
  expiryTs: number;
  expiryISO: string;
  instruments: DeribitInstrument[]; // near-ATM per expiry
};

export type UseDeribitInstrumentsATMOptions = {
  currency?: "BTC" | "ETH";
  perExpiry?: number;  // keep N closest strikes per expiry
  bandPct?: number;    // ±% around spot to consider “near ATM”
  maxExpiries?: number;
  refreshMs?: number;  // optional polling; 0 = off
};

function groupByExpiryNearATM(
  instruments: DeribitInstrument[],
  indexPrice: number,
  { perExpiry, bandPct, maxExpiries }: { perExpiry: number; bandPct: number; maxExpiries: number }
): Group[] {
  const now = Date.now();
  const buckets = new Map<number, DeribitInstrument[]>();

  for (const inst of instruments) {
    if (!inst.is_active || inst.kind !== "option") continue;
    if (!inst.expiration_timestamp || !inst.strike) continue;
    if (inst.expiration_timestamp - now <= 12 * 60 * 60 * 1000) continue; // skip ~today

    const arr = buckets.get(inst.expiration_timestamp) || [];
    arr.push(inst);
    buckets.set(inst.expiration_timestamp, arr);
  }

  const expiries = Array.from(buckets.keys()).sort((a, b) => a - b).slice(0, maxExpiries);
  const lo = indexPrice * (1 - bandPct);
  const hi = indexPrice * (1 + bandPct);

  const groups: Group[] = [];
  for (const ts of expiries) {
    const near = (buckets.get(ts) || [])
      .filter(i => (i.strike ?? 0) >= lo && (i.strike ?? 0) <= hi)
      .map(i => ({ i, d: Math.abs((i.strike ?? 0) - indexPrice) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, perExpiry)
      .map(x => x.i);

    if (near.length) {
      groups.push({
        expiryTs: ts,
        expiryISO: new Date(ts).toISOString().slice(0, 10),
        instruments: near,
      });
    }
  }
  return groups;
}

type State = { indexPrice: number; groups: Group[]; currency: "BTC" | "ETH" };

export function useDeribitInstrumentsATM(options: UseDeribitInstrumentsATMOptions = {}) {
  const {
    currency = "BTC",
    perExpiry = 5,
    bandPct = 0.07,
    maxExpiries = 8,
    refreshMs = 0,
  } = options;

  const [data, setData] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const run = async (signal?: AbortSignal) => {
    try {
      setLoading(true); setError(null);
      const [instruments, indexPrice] = await Promise.all([
        getInstruments("BTC"),
        getIndexPrice("BTC"),
      ]);
      if (signal?.aborted) return;
      const groups = groupByExpiryNearATM(instruments, indexPrice, { perExpiry, bandPct, maxExpiries });
      setData({ indexPrice, groups, currency });
    } catch (e: any) {
      if (!signal?.aborted) setError(e?.message ?? "Failed to load Deribit instruments");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ctl = new AbortController();
    run(ctl.signal);
    return () => ctl.abort();
  }, [currency, perExpiry, bandPct, maxExpiries]);

  useEffect(() => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    if (refreshMs > 0) {
      timer.current = window.setInterval(() => {
        const ctl = new AbortController();
        run(ctl.signal);
      }, refreshMs) as unknown as number;
    }
    return () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; };
  }, [refreshMs, currency, perExpiry, bandPct, maxExpiries]);

  const reload = () => run();

  return { data, loading, error, reload };
}
