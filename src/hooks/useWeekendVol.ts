// src/hooks/useWeekendVol.ts
import { useEffect, useMemo, useState } from "react";
import type { Currency, DeribitInstrument } from "../services/deribit";
import { getInstruments, getTicker } from "../services/deribit";
import { buildAtmIvPoints } from "../lib/atmIv";
import { useDeribitIndexPrice } from "./useDeribitIndexPrice";
import { useDeribitFunding } from "./useDeribitFunding";
import { useDeribitSkew25D } from "./useDeribitSkew25D";
import { useDeribitPerpMark } from "./useDeribitPerpMark";

export type WeekendVolState = {
  loading: boolean;
  currency: Currency;

  // core inputs
  sunAtmIv: number | null;     // decimal (0.45 = 45%)
  oneWAtmIv: number | null;    // decimal
  funding8h: number | null;    // decimal per 8h (0.0015 = 0.15%)
  perpMark: number | null;
  indexPrice: number | null;
  basisPct: number | null;     // (perpMark - index)/index

  // 7D skew (25Δ RR from your hook)
  skew7d: {
    rr25: number | null;
    ivC25: number | null;
    ivP25: number | null;
    expiryTs?: number;
  } | null;

  // decision
  signal: "GO" | "NO-GO" | null;
  reasons: {
    sunVs1wOk: boolean | null;
    fundingOk: boolean | null;
    sunVs1wRatio: number | null; // sun / 1w
  };

  meta: {
    sunExpiry?: number;
    oneWExpiry?: number;
    asOf?: number;
  };

  error?: string | null;
  refresh: () => void;
};

const DAY_MS = 86_400_000;

function isSunday(ts: number) {
  return new Date(ts).getUTCDay() === 0; // Sunday (UTC)
}

function nearestTo<T>(arr: T[], proj: (x: T) => number, target: number): T | undefined {
  let best: T | undefined;
  let bestDelta = Infinity;
  for (const x of arr) {
    const d = Math.abs(proj(x) - target);
    if (d < bestDelta) { best = x; bestDelta = d; }
  }
  return best;
}

function nearestStrike(list: DeribitInstrument[], spot: number, type: "call" | "put") {
  const eligible = list.filter(i => i.option_type === type && typeof i.strike === "number");
  if (!eligible.length) return undefined;
  let best = eligible[0];
  let bestDelta = Math.abs((best.strike as number) - spot);
  for (let i = 1; i < eligible.length; i++) {
    const d = Math.abs((eligible[i].strike as number) - spot);
    if (d < bestDelta) { best = eligible[i]; bestDelta = d; }
  }
  return best;
}

/**
 * Try to get the next Sunday expiry directly from instruments (preferred).
 * If listed (Deribit posts it on Wednesday), we’ll capture it explicitly.
 */
async function pickNextSundayGroup(currency: Currency): Promise<{
  expiryTs: number | null;
  instruments: DeribitInstrument[] | null;
}> {
  const r = await getInstruments({ currency, kind: "option", expired: false });
  const list: DeribitInstrument[] = (r as any)?.instruments ?? (r as any) ?? [];
  const now = Date.now() + 15 * 60 * 1000; // small safety margin

  // Find the *next* Sunday expiry strictly after now
  const sundayTs = list
    .map(i => i.expiration_timestamp as number)
    .filter(ts => ts > now && isSunday(ts))
    .sort((a, b) => a - b)[0];

  if (!sundayTs) return { expiryTs: null, instruments: null };
  const group = list.filter(i => i.expiration_timestamp === sundayTs);
  return { expiryTs: sundayTs, instruments: group.length ? group : null };
}

export function useWeekendVol(
  currency: Currency = "BTC",
  opts?: { refreshMs?: number } // optional periodic refresh for the ATM IV snapshot
): WeekendVolState {
  const refreshMs = Math.max(0, opts?.refreshMs ?? 60_000); // default 60s

  // 1) Index & perp mark (parity hooks)
  const { price: indexSpot } = useDeribitIndexPrice(currency, 15000);
  const { mark: perpMark, index: perpUnderlying } = useDeribitPerpMark(currency, { pollMs: 15000 });

  // 2) Funding (8h)
  const { current8h: funding8h } = useDeribitFunding(
    currency === "BTC" ? "BTC-PERPETUAL" : "ETH-PERPETUAL"
  );

  // 3) 7D skew (25Δ RR)
  const {
    loading: skewLoading,
    skew,
    ivC25,
    ivP25,
    expiryTs: skewExpiryTs,
    error: skewErr,
  } = useDeribitSkew25D({ currency, targetDays: 7 });

  // 4) One-shot ATM IV curve snapshot with tiny refresh loop
  const [atmState, setAtmState] = useState<{
    loading: boolean;
    sunAtmIv: number | null;
    oneWAtmIv: number | null;
    sunExpiry?: number;
    oneWExpiry?: number;
    asOf?: number;
    error?: string | null;
    refreshIndex: number;
  }>({ loading: true, sunAtmIv: null, oneWAtmIv: null, refreshIndex: 0 });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setAtmState(s => ({ ...s, loading: true, error: null }));

        // We’ll build the generic ATM curve first (for 1w pick),
        // then *explicitly* compute Sunday ATM IV from the Sunday group.
        const [curve, sundayPick] = await Promise.all([
          buildAtmIvPoints({
            currency,
            // curated: dense near weeklies, far collapsed — fine for 1w selection
            maxExpiries: 12,
            nearDays: 14,
          }),
          pickNextSundayGroup(currency),
        ]);

        if (cancelled) return;
        const pts = curve.points || [];

        // --- 1) 1w ATM IV: nearest to 7 DTE from the curve ---
        const oneW = nearestTo(pts, p => p.dteDays, 7);
        const oneWAtmIv = oneW?.iv ?? null;
        const oneWExpiry = oneW?.expiryTs ?? undefined;

        // --- 2) Sun ATM IV: STRICTLY from the explicit Sunday group (if listed) ---
        let sunAtmIv: number | null = null;
        let sunExpiry: number | undefined = undefined;

        const indexRef =
          typeof indexSpot === "number" ? indexSpot
          : typeof perpUnderlying === "number" ? perpUnderlying
          : curve.indexPrice ?? null;

        if (sundayPick.expiryTs && sundayPick.instruments && typeof indexRef === "number") {
          const calls = sundayPick.instruments.filter(i => i.option_type === "call");
          const callATM = nearestStrike(calls, indexRef, "call");

          if (callATM?.instrument_name) {
            const tkr = await getTicker(callATM.instrument_name);
            const iv = (tkr as any)?.mark_iv;
            if (typeof iv === "number" && isFinite(iv)) {
              sunAtmIv = iv;
              sunExpiry = sundayPick.expiryTs;
            }
          }
        }

        // If Sunday wasn’t listed yet (Mon/Tue), allow a *soft fallback* ONLY if the curve
        // already has a Sunday point (some venues expose it early). Otherwise keep null.
        if (sunAtmIv == null) {
          const fromCurve = pts.find(p => isSunday(p.expiryTs));
          if (fromCurve) {
            sunAtmIv = fromCurve.iv ?? null;
            sunExpiry = fromCurve.expiryTs;
          }
        }

        setAtmState(s => ({
          ...s,
          loading: false,
          sunAtmIv,
          oneWAtmIv,
          sunExpiry,
          oneWExpiry,
          asOf: curve.asOf,
        }));
      } catch (e: any) {
        if (cancelled) return;
        setAtmState(s => ({ ...s, loading: false, error: e?.message ?? String(e) }));
      }
    };

    run();
    if (refreshMs > 0) {
      const id = window.setInterval(() => {
        setAtmState(s => ({ ...s, refreshIndex: s.refreshIndex + 1 }));
      }, refreshMs);
      return () => { cancelled = true; window.clearInterval(id); };
    }
    return () => { cancelled = true; };
  }, [currency, refreshMs, indexSpot, perpUnderlying]);

  // 5) Choose the best available index for basis calc: prefer indexSpot, fallback to perpUnderlying
  const indexPrice = indexSpot ?? perpUnderlying ?? null;

  const basisPct = useMemo(() => {
    if (typeof perpMark === "number" && typeof indexPrice === "number" && indexPrice > 0) {
      return (perpMark - indexPrice) / indexPrice;
    }
    return null;
  }, [perpMark, indexPrice]);

  // 6) Decision logic
  const { signal, reasons } = useMemo(() => {
    const a = atmState.sunAtmIv;
    const b = atmState.oneWAtmIv;
    const r = typeof a === "number" && typeof b === "number" && b > 0 ? a / b : null;

    const sunVs1wOk = typeof r === "number" ? r <= 1.05 : null;
    const f8h = typeof funding8h === "number" ? funding8h : null;
    const fundingOk = f8h !== null ? Math.abs(f8h) <= 0.0015 : null;

    let sig: "GO" | "NO-GO" | null = null;
    if (sunVs1wOk !== null && fundingOk !== null && r !== null) {
      sig = sunVs1wOk && fundingOk ? "GO" : "NO-GO";
    }

    return {
      signal: sig,
      reasons: { sunVs1wOk, fundingOk, sunVs1wRatio: r },
    };
  }, [atmState.sunAtmIv, atmState.oneWAtmIv, funding8h]);

  const loading = atmState.loading || skewLoading;
  const error = atmState.error || skewErr || null;

  return {
    loading,
    currency,
    sunAtmIv: atmState.sunAtmIv,
    oneWAtmIv: atmState.oneWAtmIv,
    funding8h: typeof funding8h === "number" ? funding8h : null,
    perpMark: perpMark ?? null,
    indexPrice,
    basisPct,
    skew7d: {
      rr25: typeof skew === "number" ? skew : null,
      ivC25: typeof ivC25 === "number" ? ivC25 : null,
      ivP25: typeof ivP25 === "number" ? ivP25 : null,
      expiryTs: skewExpiryTs ?? undefined,
    },
    signal,
    reasons,
    meta: {
      sunExpiry: atmState.sunExpiry,
      oneWExpiry: atmState.oneWExpiry,
      asOf: atmState.asOf,
    },
    error,
    refresh: () => setAtmState(s => ({ ...s, refreshIndex: s.refreshIndex + 1 })),
  };
}
