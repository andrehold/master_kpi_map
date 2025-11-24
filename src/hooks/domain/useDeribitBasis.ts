import { useMemo, useCallback } from "react";
import { useDeribitIndexPrice } from "./useDeribitIndexPrice";
import { useDeribitTicker } from "./useDeribitTicker";

/** Parse a Deribit future like BTC-27DEC25 to an expiry timestamp (ms). */
function parseExpiryFromInstrument(instrument?: string | null): number | null {
  if (!instrument) return null;
  if (instrument.endsWith("-PERPETUAL")) return null;

  // Format: COIN-DDMMMyy (e.g., BTC-27DEC25)
  const parts = instrument.split("-");
  if (parts.length < 2) return null;
  const m = parts[1]?.match(/^(\d{2})([A-Z]{3})(\d{2})$/);
  if (!m) return null;
  const [, ddStr, monStr, yyStr] = m;

  const MONS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const monIdx = MONS.indexOf(monStr);
  if (monIdx < 0) return null;

  const year = 2000 + parseInt(yyStr, 10);
  const day = parseInt(ddStr, 10);

  // Deribit futures typically expire around 08:00 UTC on the date; use 08:00 as a sensible default.
  const ts = Date.UTC(year, monIdx, day, 8, 0, 0, 0);
  return Number.isFinite(ts) ? ts : null;
}

export type BasisResult = {
  /** Spot index (Deribit index) */
  spot: number | null;
  /** Future/Perp mid/mark */
  future: number | null;
  /** Absolute basis (future - spot) in currency units */
  basisAbs: number | null;
  /** Relative basis as a fraction (e.g., 0.0123 = 1.23%) */
  basisPct: number | null;
  /** Annualized basis (fraction), only for dated futures; null for PERPETUAL */
  annualizedPct: number | null;
  /** Latest update timestamp (ms) across both sources */
  lastUpdated: number | null;
  /** Whether instrument is PERPETUAL */
  isPerp: boolean;
  /** Any error from either source */
  error: string | null;
  /** Loading if either source is loading */
  loading: boolean;
  /** The instrument name actually used */
  instrumentUsed: string;
  /** Trigger both fetches immediately */
  refresh: () => void;
};

/**
 * Computes Spot–perp / futures basis.
 * - If `instrument_name` is omitted, uses the PERPETUAL for the given currency.
 * - Returns raw (Δ) and % basis; for dated futures also returns annualized %.
 */
export function useDeribitBasis(
  currency: "BTC" | "ETH",
  instrument_name?: string,
  pollMs = 15_000
): BasisResult {
  const instrumentUsed = instrument_name ?? (currency === "BTC" ? "BTC-PERPETUAL" : "ETH-PERPETUAL");

  const {
    price: spot,
    lastUpdated: spotTs,
    loading: spotLoading,
    error: spotErr,
    refresh: refreshSpot,
  } = useDeribitIndexPrice(currency, pollMs);

  const {
    midPrice: fut,
    lastUpdated: futTs,
    loading: futLoading,
    error: futErr,
    refresh: refreshFut,
  } = useDeribitTicker(instrumentUsed, pollMs);

  const isPerp = instrumentUsed.endsWith("-PERPETUAL");
  const expiryTs = useMemo(() => parseExpiryFromInstrument(instrumentUsed), [instrumentUsed]);

  const { basisAbs, basisPct, annualizedPct } = useMemo(() => {
    if (spot == null || fut == null || !Number.isFinite(spot) || !Number.isFinite(fut) || spot <= 0) {
      return { basisAbs: null, basisPct: null, annualizedPct: null };
    }
    const abs = fut - spot;
    const pct = abs / spot;

    if (isPerp || !expiryTs || expiryTs <= Date.now()) {
      return { basisAbs: abs, basisPct: pct, annualizedPct: null };
    }

    const days = (expiryTs - Date.now()) / 86_400_000;
    const ann = pct * (365 / Math.max(days, 1 / 24)); // guard against very small DTE
    return { basisAbs: abs, basisPct: pct, annualizedPct: ann };
  }, [spot, fut, expiryTs, isPerp]);

  const loading = spotLoading || futLoading;
  const error = spotErr ?? futErr ?? null;
  const lastUpdated = Math.max(spotTs ?? 0, futTs ?? 0) || null;

  const refresh = useCallback(() => {
    refreshSpot();
    refreshFut();
  }, [refreshSpot, refreshFut]);

  return {
    spot: spot ?? null,
    future: fut ?? null,
    basisAbs,
    basisPct,
    annualizedPct,
    lastUpdated,
    isPerp,
    error,
    loading,
    instrumentUsed,
    refresh,
  };
}
