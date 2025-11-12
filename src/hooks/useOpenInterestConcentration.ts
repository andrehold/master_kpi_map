import { useEffect, useMemo, useRef, useState } from "react";

// Use only the exports your deribit.ts actually provides
import { dget, getIndexPrice } from "../services/deribit";

export type Currency = "BTC" | "ETH";

export type OIStrikeBucket = {
  strike: number;
  oi: number;          // in coin units (BTC/ETH) as Deribit reports
  callsOi: number;     // optional split
  putsOi: number;      // optional split
};

export type OIConcentrationMetrics = {
  ts: number;
  currency: Currency;
  expiryScope: "front" | "all";
  windowPct?: number;
  indexPrice?: number;

  totalOi: number;
  topN: number;
  topNShare: number;   // 0..1
  top1Share: number;   // 0..1
  hhi: number;         // 0..1 (on included mass)
  hhiNorm: number;     // normalized HHI (same as hhi here)
  entropy: number;     // nats
  gini: number;        // 0..1

  dominantStrike?: number;
  dominantOi?: number;

  rankedStrikes: OIStrikeBucket[];
  includedCount: number;
  scannedCount: number;
  frontExpiryTs?: number;
};

export type UseOICOptions = {
  currency: Currency;
  expiry?: "front" | "all";  // default "front"
  windowPct?: number;        // ±window, e.g., 0.25 for ±25%
  topN?: number;             // default 3
  pollMs?: number;           // default 60_000; 0 disables polling
};

// ---- tiny local logger so we don't depend on deribit.ts internals ----------
function isDbg() {
  try {
    if (typeof window !== "undefined") {
      // Matches your deribit.ts debug switches
      // @ts-ignore
      if (window.__DERIBIT_DEBUG__ === true) return true;
      if (localStorage.getItem("deribitDebug") === "1") return true;
    }
  } catch {}
  return false;
}
function dlog(...args: any[]) {
  if (!isDbg()) return;
  try { console.log("[oic]", ...args); } catch {}
}

// ---- Deribit shapes --------------------------------------------------------
type DeribitBookSummary = {
  instrument_name: string;
  open_interest?: number;             // coin units
  expiration_timestamp?: number;      // ms
  strike?: number;
  option_type?: "call" | "put";
};

type DeribitBookSummaryResponse = {
  result?: DeribitBookSummary[];
} | DeribitBookSummary[];

function unwrapResult<T>(r: { result?: T } | T | null | undefined): T | undefined {
  if (!r) return undefined;
  // @ts-ignore
  return (r.result ?? r) as T;
}

function parseStrikeFromInstrument(instrument: string): number | undefined {
  // Example: BTC-30DEC22-40000-C
  const parts = instrument.split("-");
  if (parts.length < 4) return undefined;
  const maybe = parts[parts.length - 2];
  const v = Number(maybe);
  return Number.isFinite(v) ? v : undefined;
}

function parseTypeFromInstrument(instrument: string): "call" | "put" | undefined {
  const last = instrument.split("-").pop();
  if (!last) return;
  if (last.toUpperCase() === "C") return "call";
  if (last.toUpperCase() === "P") return "put";
  return;
}

function calcEntropy(p: number[]): number {
  // Shannon entropy (nats)
  let s = 0;
  for (const x of p) if (x > 0) s += x * Math.log(1 / x);
  return s;
}

function calcGini(values: number[]): number {
  // Gini coefficient for non-negative values
  const n = values.length;
  if (n === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let cum = 0;
  let B = 0;
  for (let i = 0; i < n; i++) {
    cum += sorted[i];
    B += cum;
  }
  return 1 + 1 / n - (2 * B) / (n * total);
}

export function useOpenInterestConcentration({
  currency,
  expiry = "front",
  windowPct,
  topN = 3,
  pollMs = 60_000,
}: UseOICOptions) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [metrics, setMetrics] = useState<OIConcentrationMetrics | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const alive = useRef(true);

  async function fetchOnce() {
    try {
      setError(null);

      // 1) Pull all option summaries (includes per-instrument open_interest)
      dlog("fetch summaries", { currency });
      const raw = await dget<DeribitBookSummaryResponse>("/public/get_book_summary_by_currency", {
        currency,
        kind: "option",
        expired: false,
      });
      const list = unwrapResult<DeribitBookSummary[]>(raw) ?? [];
      const scannedCount = list.length;

      // 2) Identify front expiry if needed
      let selectedExpiryTs: number | undefined;
      if (expiry === "front") {
        for (const x of list) {
          if (typeof x.expiration_timestamp === "number") {
            selectedExpiryTs =
              typeof selectedExpiryTs === "number"
                ? Math.min(selectedExpiryTs, x.expiration_timestamp)
                : x.expiration_timestamp;
          }
        }
      }

      // 3) Index price only if windowing is requested
      let indexPrice: number | undefined = undefined;
      if (typeof windowPct === "number" && windowPct > 0) {
        const idx = await getIndexPrice(currency as any);
        if (typeof idx === "number") indexPrice = idx;
        else if (idx && typeof idx === "object") {
          // @ts-ignore
          indexPrice = idx.index_price ?? idx.price ?? undefined;
        }
      }

      // 4) Aggregate OI by strike (apply expiry/window filters)
      const byStrike = new Map<number, OIStrikeBucket>();

      const strikeInWindow = (strike: number) => {
        if (!indexPrice || typeof windowPct !== "number" || windowPct <= 0) return true;
        const lo = indexPrice * (1 - windowPct);
        const hi = indexPrice * (1 + windowPct);
        return strike >= lo && strike <= hi;
      };

      for (const it of list) {
        if (expiry === "front" && typeof selectedExpiryTs === "number") {
          if (it.expiration_timestamp !== selectedExpiryTs) continue;
        }
        const oi = Number(it.open_interest ?? 0);
        if (!(oi > 0)) continue;

        const strike =
          typeof it.strike === "number" && Number.isFinite(it.strike)
            ? it.strike
            : parseStrikeFromInstrument(it.instrument_name);
        if (typeof strike !== "number" || !Number.isFinite(strike)) continue;

        if (!strikeInWindow(strike)) continue;

        const type = (it.option_type as "call" | "put" | undefined) ?? parseTypeFromInstrument(it.instrument_name);

        let bucket = byStrike.get(strike);
        if (!bucket) {
          bucket = { strike, oi: 0, callsOi: 0, putsOi: 0 };
          byStrike.set(strike, bucket);
        }
        bucket.oi += oi;
        if (type === "call") bucket.callsOi += oi;
        if (type === "put") bucket.putsOi += oi;
      }

      const buckets: OIStrikeBucket[] = [...byStrike.values()];
      const includedCount = buckets.length;

      // 5) Concentration metrics
      const totalOi = buckets.reduce((a, b) => a + b.oi, 0);
      const rankedStrikes = buckets.sort((a, b) => b.oi - a.oi);
      const p = totalOi > 0 ? rankedStrikes.map((x) => x.oi / totalOi) : [];

      const top1Share = p[0] ?? 0;
      const topNShare = p.slice(0, Math.max(1, topN)).reduce((a, b) => a + b, 0);
      const hhi = p.reduce((a, b) => a + b * b, 0);
      const hhiNorm = hhi;
      const entropy = calcEntropy(p);
      const gini = calcGini(rankedStrikes.map((x) => x.oi));

      const ts = Date.now();
      const dominantStrike = rankedStrikes[0]?.strike;
      const dominantOi = rankedStrikes[0]?.oi;

      const m: OIConcentrationMetrics = {
        ts,
        currency,
        expiryScope: expiry,
        windowPct,
        indexPrice,
        totalOi,
        topN,
        topNShare,
        top1Share,
        hhi,
        hhiNorm,
        entropy,
        gini,
        dominantStrike,
        dominantOi,
        rankedStrikes,
        includedCount,
        scannedCount,
        frontExpiryTs: selectedExpiryTs,
      };

      if (!alive.current) return;
      setMetrics(m);
      setLoading(false);
    } catch (err) {
      if (!alive.current) return;
      setError(err);
      setLoading(false);
      dlog("error", err);
    }
  }

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    fetchOnce();

    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (pollMs && pollMs > 0) {
      timer.current = setInterval(fetchOnce, pollMs);
    }
    return () => {
      alive.current = false;
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, expiry, windowPct, topN, pollMs]);

  return useMemo(() => ({ loading, error, metrics }), [loading, error, metrics]);
}
