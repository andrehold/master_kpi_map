// src/hooks/useDeribitPerpMark.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { getTicker, type Currency } from "../services/deribit";

export type UseDeribitPerpMarkOpts = {
  pollMs?: number; // default 15s
};

export type UseDeribitPerpMarkState = {
  loading: boolean;
  instrument: string;
  mark: number | null;
  index: number | null; // Deribit returns underlying_price on ticker; handy for basis
  error: string | null;
  refresh: () => void;
};

function instrumentFor(currency: Currency) {
  return currency === "BTC" ? "BTC-PERPETUAL" : "ETH-PERPETUAL";
}

/**
 * Polls Deribit ticker for the perpetual to expose mark & index (underlying).
 * Parity with your existing hooks (index price, funding, skew...).
 */
export function useDeribitPerpMark(
  currency: Currency = "BTC",
  opts?: UseDeribitPerpMarkOpts
): UseDeribitPerpMarkState {
  const pollMs = Math.max(0, opts?.pollMs ?? 15_000);
  const instrument = instrumentFor(currency);

  const [state, setState] = useState<UseDeribitPerpMarkState>({
    loading: true,
    instrument,
    mark: null,
    index: null,
    error: null,
    refresh: () => {},
  });

  const refreshIdx = useRef(0);

  // stable refresh fn
  const refresh = useMemo(
    () => () => {
      refreshIdx.current++;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setState((s) => ({ ...s, loading: true, error: null, instrument }));
        const tkr = await getTicker(instrument);
        if (cancelled) return;
        const mark =
          typeof tkr?.mark_price === "number" && isFinite(tkr.mark_price)
            ? tkr.mark_price
            : null;
        const index =
          typeof (tkr as any)?.underlying_price === "number" &&
          isFinite((tkr as any).underlying_price)
            ? (tkr as any).underlying_price
            : null;

        setState((s) => ({
          ...s,
          loading: false,
          instrument,
          mark,
          index,
          error: null,
          refresh,
        }));
      } catch (e: any) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          instrument,
          error: e?.message ?? String(e),
          refresh,
        }));
      }
    }

    run();

    if (pollMs > 0) {
      const id = window.setInterval(run, pollMs);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [currency, instrument, pollMs, refreshIdx.current]);

  // keep state.instrument synced if currency changes (avoid stale label)
  useEffect(() => {
    setState((s) => (s.instrument === instrument ? s : { ...s, instrument }));
  }, [instrument]);

  return state;
}
