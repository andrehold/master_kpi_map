// src/hooks/domain/usePerpHistory.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPerpHistory, type Currency, type PriceCandle } from "../../services/deribit";

type CacheEntry = { ts: number; candles: PriceCandle[] };

// Module-level cache (shared across all hook instances)
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PriceCandle[]>>();

export type PerpHistoryState = {
  loading: boolean;
  error: string | null;
  candles: PriceCandle[];
  lastUpdated: number | null;
  reload: () => void;
};

export type UsePerpHistoryOpts = {
  currency: Currency;
  limit?: number;
  resolutionSec?: number;
  /** If cached data is newer than this, we don’t refetch (unless reload() is called) */
  staleMs?: number;
  enabled?: boolean;
};

function keyFor(currency: Currency, limit: number, resolutionSec: number) {
  // include limit because Deribit start time depends on it
  return `${currency}|${resolutionSec}|${limit}`;
}

export function usePerpHistory(opts: UsePerpHistoryOpts): PerpHistoryState {
  const currency = opts.currency;
  const limit = opts.limit ?? 400;
  const resolutionSec = opts.resolutionSec ?? 86400;
  const staleMs = opts.staleMs ?? 60_000;
  const enabled = opts.enabled ?? true;

  const cacheKey = useMemo(() => keyFor(currency, limit, resolutionSec), [currency, limit, resolutionSec]);

  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((x) => x + 1), []);

  const [state, setState] = useState<PerpHistoryState>(() => {
    const entry = cache.get(cacheKey);
    return {
      loading: enabled ? !entry : false,
      error: null,
      candles: entry?.candles ?? [],
      lastUpdated: entry?.ts ?? null,
      reload,
    };
  });

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false, error: null, reload }));
      return;
    }

    let cancelled = false;

    const now = Date.now();
    const entry = cache.get(cacheKey);
    const isFresh = !!entry && now - entry.ts < staleMs;
    const forced = reloadTick > 0;

    // If we have fresh cached data and this isn't a forced reload, just serve it.
    if (isFresh && !forced) {
      setState((s) => ({
        ...s,
        loading: false,
        error: null,
        candles: entry!.candles,
        lastUpdated: entry!.ts,
        reload,
      }));
      return;
    }

    // We will fetch. If we have cached data, keep showing it while loading.
    setState((s) => ({
      ...s,
      loading: true,
      error: null,
      candles: entry?.candles ?? s.candles ?? [],
      lastUpdated: entry?.ts ?? s.lastUpdated ?? null,
      reload,
    }));

    let p = inflight.get(cacheKey);
    if (!p) {
      p = fetchPerpHistory(currency, limit, resolutionSec);
      inflight.set(cacheKey, p);
    }

    p.then((candles) => {
      inflight.delete(cacheKey);
      if (cancelled) return;

      const ts = Date.now();
      cache.set(cacheKey, { ts, candles });

      setState({
        loading: false,
        error: null,
        candles,
        lastUpdated: ts,
        reload,
      });
    }).catch((e: any) => {
      inflight.delete(cacheKey);
      if (cancelled) return;

      setState((s) => ({
        ...s,
        loading: false,
        error: e?.message ?? String(e),
        reload,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, currency, limit, resolutionSec, staleMs, enabled, reloadTick, reload]);

  return state;
}
