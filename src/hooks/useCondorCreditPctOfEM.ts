// src/hooks/useCondorCreditPctOfEM.ts

import { useEffect, useState } from "react";
import { dget, type DeribitInstrument } from "../services/deribit";
import { pickNearestInstrumentByType } from "../lib/deribitOptionMath";
import { ceilExpiry, expectedMove } from "../lib/selectExpiries";

type Currency = "BTC" | "ETH";

const DAY_MS = 24 * 60 * 60 * 1000;
const TARGET_DTE_DAYS = 30;

type BookSummary = {
  mark_price?: number | null;
  bid_price?: number | null;
  ask_price?: number | null;
  last_price?: number | null;
  mark_iv?: number | null; // Deribit IV (decimal or percent)
};

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
      try {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: true, error: null }));
        }

        const data = await fetchCondorCreditPctOfEM(currency);

        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err as Error,
          }));
        }
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
  const atmSummary = await getBookSummary(atmCall.instrument_name);

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
  const longPutTarget = indexPrice - 2 * emUsd;
  const shortCallTarget = indexPrice + emUsd;
  const longCallTarget = indexPrice + 2 * emUsd;

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
    getBookSummary(longPutInst.instrument_name),
    getBookSummary(shortPutInst.instrument_name),
    getBookSummary(shortCallInst.instrument_name),
    getBookSummary(longCallInst.instrument_name),
  ]);

  const longPutPrice = extractMarkPrice(longPutSummary);
  const shortPutPrice = extractMarkPrice(shortPutSummary);
  const shortCallPrice = extractMarkPrice(shortCallSummary);
  const longCallPrice = extractMarkPrice(longCallSummary);

  // Deribit option prices are denominated in underlying (BTC / ETH).
  // Convert to USD so EM and credit are comparable.
  const creditInUnderlying =
    shortPutPrice + shortCallPrice - (longPutPrice + longCallPrice);

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
  };
}

async function getBookSummary(
  instrumentName: string
): Promise<BookSummary> {
  const res = await dget<BookSummary[]>(
    "/public/get_book_summary_by_instrument",
    { instrument_name: instrumentName }
  );
  if (!res || !res.length) {
    throw new Error(`No book summary for instrument ${instrumentName}`);
  }
  return res[0];
}

function extractMarkPrice(summary: BookSummary): number {
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
