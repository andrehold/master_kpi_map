// src/hooks/useCondorCreditPctOfEM.ts

import { useEffect, useState } from "react";
import { dget, getOptionBookSummary, type DeribitInstrument, type BookSummaryRow } from "../../services/deribit";
import { pickNearestInstrumentByType } from "../../lib/deribitOptionMath";
import { ceilExpiry, expectedMove } from "../../lib/selectExpiries";

type Currency = "BTC" | "ETH";

const DAY_MS = 24 * 60 * 60 * 1000;
const TARGET_DTE_DAYS = 30;

export type CondorCreditPctOfEMPoint = {
  currency: Currency;
  expiryTimestamp: number;
  dte: number;
  indexPrice: number;
  emUsd: number;
  condorCreditUsd: number;
  pctOfEm: number;
  strikes: {
    longPut: number;
    shortPut: number;
    shortCall: number;
    longCall: number;
  };
  instruments: {
    longPut: string;
    shortPut: string;
    shortCall: string;
    longCall: string;
  };
  legs: {
    longPut: { delta: number | null; premiumUsd: number | null };
    shortPut: { delta: number | null; premiumUsd: number | null };
    shortCall: { delta: number | null; premiumUsd: number | null };
    longCall: { delta: number | null; premiumUsd: number | null };
  };
};

type State = {
  data: CondorCreditPctOfEMPoint | null;
  loading: boolean;
  error: Error | null;
};

export function useCondorCreditPctOfEM(params: {
  currency?: Currency;
  pollMs?: number;
}): State {
  const { currency = "BTC", pollMs = 60_000 } = params;

  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    async function loadOnce() {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await fetchCondorCreditPctOfEM(currency);
        if (cancelled) return; // ✅ check once before setState
        setState({ data, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err as Error }));
      }
    }

    loadOnce();

    if (pollMs && pollMs > 0 && typeof window !== "undefined") {
      intervalId = window.setInterval(loadOnce, pollMs);
    }

    return () => {
      cancelled = true;
      if (intervalId !== undefined && typeof window !== "undefined") {
        window.clearInterval(intervalId);
      }
    };
  }, [currency, pollMs]);

  return state;
}

// === helpers =======================================================

function normalizeDelta(value: number | null | undefined): number | null {
  if (value == null || !isFinite(value)) return null;
  return value;
}

async function fetchCondorCreditPctOfEM(
  currency: Currency
): Promise<CondorCreditPctOfEMPoint> {
  const now = Date.now();

  // 1) Fetch all non-expired option instruments
  const instruments = await dget<DeribitInstrument[]>(
    "/public/get_instruments",
    {
      currency,
      kind: "option",
      expired: false,
    }
  );

  if (!instruments || instruments.length === 0) {
    throw new Error("No option instruments returned from Deribit");
  }

  // Unique future expiries
  const futureExpiries = Array.from(
    new Set(
      instruments
        .map((i) => i.expiration_timestamp)
        .filter((ts) => typeof ts === "number" && ts > now)
    )
  ).sort((a, b) => a - b);

  if (!futureExpiries.length) {
    throw new Error("No future-dated option expiries found");
  }

  // 2) Use ceilExpiry from selectExpiries.ts to get the ~30D expiry
  const pickedTs =
    ceilExpiry(futureExpiries, TARGET_DTE_DAYS, { toleranceDays: 0 }) ??
    futureExpiries[futureExpiries.length - 1];

  const bestExpiryTs = pickedTs;
  const dte = (bestExpiryTs - now) / DAY_MS;

  const chain = instruments.filter(
    (i) => i.expiration_timestamp === bestExpiryTs
  );
  if (!chain.length) {
    throw new Error("No instruments for selected expiry");
  }

  // 3) Index / spot
  const indexName = currency === "BTC" ? "btc_usd" : "eth_usd";
  const idx = await dget<{ index_price?: number; price?: number }>(
    "/public/get_index_price",
    { index_name: indexName }
  );
  const indexPrice = idx.index_price ?? idx.price;
  if (!indexPrice || !isFinite(indexPrice)) {
    throw new Error("Invalid index price");
  }

  // 4) ATM IV from nearest-to-the-money call
  const atmCall = pickNearestInstrumentByType(chain, "call", indexPrice);
  if (!atmCall) {
    throw new Error("Unable to find ATM call");
  }
  const atmSummary = await getOptionBookSummary(atmCall.instrument_name);

  // Deribit sometimes gives IV in percent; normalize to decimal.
  const rawIv = atmSummary.mark_iv ?? 0;
  const ivDecimal =
    typeof rawIv === "number"
      ? rawIv > 1
        ? rawIv / 100
        : rawIv
      : 0;

  if (!ivDecimal || !isFinite(ivDecimal) || ivDecimal <= 0) {
    throw new Error("Invalid ATM IV (sigma)");
  }

  // Time to expiry in years (ACT/365), consistent with selectExpiries.ts
  const tAnnual = Math.max(bestExpiryTs - now, 0) / DAY_MS / 365;

  if (tAnnual <= 0) {
    throw new Error("Non-positive time to expiry");
  }

  // 5) Expected move using shared helper
  const { em: emUsd } = expectedMove(indexPrice, ivDecimal, tAnnual);

  // 6) Condor: shorts at ±1·EM, longs at ±2·EM
  const shortPutTarget = indexPrice - emUsd;
  const longPutTarget = indexPrice - 1.5 * emUsd;
  const shortCallTarget = indexPrice + emUsd;
  const longCallTarget = indexPrice + 1.5 * emUsd;

  const longPutInst = pickNearestInstrumentByType(chain, "put", longPutTarget);
  const shortPutInst = pickNearestInstrumentByType(chain, "put", shortPutTarget);
  const shortCallInst = pickNearestInstrumentByType(chain, "call", shortCallTarget);
  const longCallInst = pickNearestInstrumentByType(chain, "call", longCallTarget);

  if (!longPutInst || !shortPutInst || !shortCallInst || !longCallInst) {
    throw new Error("Unable to find strikes for condor structure");
  }

  const [
    longPutSummary,
    shortPutSummary,
    shortCallSummary,
    longCallSummary,
  ] = await Promise.all([
    getOptionBookSummary(longPutInst.instrument_name),
    getOptionBookSummary(shortPutInst.instrument_name),
    getOptionBookSummary(shortCallInst.instrument_name),
    getOptionBookSummary(longCallInst.instrument_name),
  ]);

  const longPutPrice = extractMarkPrice(longPutSummary);
  const shortPutPrice = extractMarkPrice(shortPutSummary);
  const shortCallPrice = extractMarkPrice(shortCallSummary);
  const longCallPrice = extractMarkPrice(longCallSummary);

  // --- per-leg deltas -------------------------------------------------
  const longPutDeltaRaw = longPutSummary.delta ?? null;
  const shortPutDeltaRaw = shortPutSummary.delta ?? null;
  const shortCallDeltaRaw = shortCallSummary.delta ?? null;
  const longCallDeltaRaw = longCallSummary.delta ?? null;

  const longPutDelta = normalizeDelta(longPutDeltaRaw);
  const shortPutDelta = normalizeDelta(shortPutDeltaRaw);
  const shortCallDelta = normalizeDelta(shortCallDeltaRaw);
  const longCallDelta = normalizeDelta(longCallDeltaRaw);

  // Position deltas: flip sign for short legs
  const posLongPutDelta = longPutDelta;
  const posShortPutDelta = shortPutDelta != null ? -shortPutDelta : null;
  const posShortCallDelta = shortCallDelta != null ? -shortCallDelta : null;
  const posLongCallDelta = longCallDelta;

  // Deribit option prices are denominated in underlying (BTC / ETH).
  // Convert to USD so EM and credit are comparable.
  const creditInUnderlying =
    shortPutPrice + shortCallPrice - (longPutPrice + longCallPrice);

  // Per-leg premiums in USD (positive = credit, negative = debit)
  const longPutPremiumUsd = -longPutPrice * indexPrice;
  const shortPutPremiumUsd = shortPutPrice * indexPrice;
  const shortCallPremiumUsd = shortCallPrice * indexPrice;
  const longCallPremiumUsd = -longCallPrice * indexPrice;

  const condorCreditUsd = creditInUnderlying * indexPrice;

  const pctOfEm =
    emUsd > 0 && isFinite(condorCreditUsd)
      ? (condorCreditUsd / emUsd) * 100
      : NaN;

  return {
    currency,
    expiryTimestamp: bestExpiryTs,
    dte,
    indexPrice,
    emUsd,
    condorCreditUsd,
    pctOfEm,
    strikes: {
      longPut: longPutInst.strike,
      shortPut: shortPutInst.strike,
      shortCall: shortCallInst.strike,
      longCall: longCallInst.strike,
    },
    instruments: {
      longPut: longPutInst.instrument_name,
      shortPut: shortPutInst.instrument_name,
      shortCall: shortCallInst.instrument_name,
      longCall: longCallInst.instrument_name,
    },
    legs: {
      longPut: {
        delta: posLongPutDelta,
        premiumUsd: isFinite(longPutPremiumUsd) ? longPutPremiumUsd : null,
      },
      shortPut: {
        delta: posShortPutDelta,
        premiumUsd: isFinite(shortPutPremiumUsd) ? shortPutPremiumUsd : null,
      },
      shortCall: {
        delta: posShortCallDelta,
        premiumUsd: isFinite(shortCallPremiumUsd) ? shortCallPremiumUsd : null,
      },
      longCall: {
        delta: posLongCallDelta,
        premiumUsd: isFinite(longCallPremiumUsd) ? longCallPremiumUsd : null,
      },
    },
  };
}

async function getBookSummary(
  instrumentName: string
): Promise<BookSummaryRow> {
  const res = await dget<BookSummaryRow[]>(
    "/public/get_book_summary_by_instrument",
    { instrument_name: instrumentName }
  );
  if (!res || !res.length) {
    throw new Error(`No book summary for instrument ${instrumentName}`);
  }
  return res[0];
}

function extractMarkPrice(summary: BookSummaryRow): number {
  const { mark_price, bid_price, ask_price, last_price } = summary;

  if (mark_price != null && isFinite(mark_price)) return mark_price;

  const mid =
    bid_price != null &&
      isFinite(bid_price) &&
      ask_price != null &&
      isFinite(ask_price)
      ? (bid_price + ask_price) / 2
      : undefined;

  if (mid != null && isFinite(mid)) return mid;

  if (last_price != null && isFinite(last_price)) return last_price;

  throw new Error("Unable to derive a mark price from book summary");
}
