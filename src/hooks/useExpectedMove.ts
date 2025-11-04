import { useCallback, useEffect, useMemo, useState } from "react";
import { useIVTermStructure } from "./useIVTermStructure";
import { getIndexPrice, type Currency } from "../services/deribit";

/**
 * useExpectedMove
 * Computes Expected Move for a set of tenors using: EM = Spot × IV × √t
 * - IV(t) is interpolated from the IV Term Structure in *variance space*
 * - Spot is Deribit index price (btc_usd / eth_usd)
 *
 * Returns a familiar hook shape: { data, loading, error, refresh }
 */

export type TenorDef = { id: string; label: string; days: number };
export type ExpectedMoveItem = {
  id: string;
  label: string;
  days: number;
  em?: number;     // absolute expected move
  ivPct?: number;  // IV used (percent)
};

export type UseExpectedMoveArgs = {
  currency?: Currency | "BTC" | "ETH";
  tenors?: readonly TenorDef[];
};

export type UseExpectedMoveResult = {
  data: {
    items: ExpectedMoveItem[]; // in the same order as provided tenors
    byId: Record<string, ExpectedMoveItem>;
    spot: number | null;
    tsAsOf: number | null; // ms epoch
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DEFAULT_TENORS = [
  { id: "em-2d", label: "2D", days: 2 },
  { id: "em-1w", label: "1W", days: 7 },
  { id: "em-1m", label: "1M", days: 30 },
  { id: "em-3m", label: "3M", days: 90 },
] as const satisfies readonly TenorDef[];

export function useExpectedMove(
  { currency = "BTC", tenors = DEFAULT_TENORS }: UseExpectedMoveArgs = {}
): UseExpectedMoveResult {
  // 1) Source hooks / data
  const { data: tsData, loading: tsLoading, error: tsError, reload } = useIVTermStructure({ currency });

  // 2) Spot via Deribit index
  const [spot, setSpot] = useState<number | null>(null);
  const [spotLoading, setSpotLoading] = useState(false);
  const [spotError, setSpotError] = useState<string | null>(null);

  const fetchSpot = useCallback(async () => {
    try {
      setSpotLoading(true);
      const px = await getIndexPrice(currency);
      setSpot(px ?? null);
      setSpotError(null);
    } catch (e: any) {
      setSpotError(e?.message ?? "Failed to fetch index price");
    } finally {
      setSpotLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    void fetchSpot();
  }, [fetchSpot]);

  // 3) Compute EM set
  // Normalize common tenor labels/ids -> canonical day counts to avoid 3M using 1M by accident
  const normalizeTenorDays = (t: TenorDef): TenorDef => {
    const id = (t.id ?? "").toLowerCase();
    const lbl = (t.label ?? "").toUpperCase();
    if (/(^|-)3m$/.test(id) || lbl === "3M") return { ...t, days: 90 };
    if (/(^|-)1m$/.test(id) || lbl === "1M") return { ...t, days: 30 };
    if (/(^|-)1w$/.test(id) || lbl === "1W") return { ...t, days: 7 };
    if (/(^|-)1d$/.test(id) || lbl === "1D") return { ...t, days: 1 };
    return t;
  };

  const items = useMemo<ExpectedMoveItem[]>(() => {
    const pts = mapTsPoints(tsData?.points ?? []);
    const arr = tenors.map((t) => {
      const tt = normalizeTenorDays(t);
      const tY = tt.days / 365;
      const iv = ivAtVarianceInterp(pts, tY); // decimal
      if (spot != null && iv != null) {
        return {
          id: tt.id,
          label: tt.label,
          days: tt.days,
          em: spot * iv * Math.sqrt(tY),
          ivPct: iv * 100,
        };
      }
      return { id: tt.id, label: tt.label, days: tt.days };
    });
    // Dev guard to catch accidental duplication (e.g., 3M resolving to 1M)
    try {
      const oneM = arr.find(it => /(^|-)1m$/i.test(it.id) || it.label === "1M");
      const threeM = arr.find(it => /(^|-)3m$/i.test(it.id) || it.label === "3M");
      if (oneM?.em != null && threeM?.em != null && Math.abs(threeM.em - oneM.em) < 1e-9) {
        // eslint-disable-next-line no-console
        console.warn("[useExpectedMove] 3M EM equals 1M EM — check tenor mapping / data fallbacks");
      }
    } catch {}
    return arr;
  }, [tenors, tsData?.points, spot]);

  const byId = useMemo(() => {
    const m: Record<string, ExpectedMoveItem> = {};
    for (const it of items) m[it.id] = it;
    return m;
  }, [items]);

  const loading = tsLoading || spotLoading;
  const error = (tsError as string | null) || spotError || null;
  // Normalize asOf -> number | null (avoid brittle assertions)
  const tsAsOf: number | null = tsData?.asOf != null ? Number(tsData.asOf) : null;

  const refresh = useCallback(async () => {
    await Promise.allSettled([fetchSpot(), reload?.() ?? Promise.resolve()]);
  }, [fetchSpot, reload]);

  return {
    data: { items, byId, spot, tsAsOf },
    loading,
    error,
    refresh,
  };
}

// ----------------------- Helpers (shared with UI) ----------------------

type TsPoint = { tAnnual: number; iv: number };

/**
 * mapTsPoints
 * Accepts a variety of incoming shapes and returns normalized term points:
 * { tAnnual: number (years), iv: number (decimal) }
 * - Looks for percent IV fields and converts to decimal if needed.
 * - Derives tAnnual from days or expiry timestamps if available.
 */
export function mapTsPoints(raw: any[]): TsPoint[] {
  const now = Date.now();
  const DAY_MS = 24 * 3600 * 1000;
  const pts: TsPoint[] = [];

  for (const p of raw ?? []) {
    // IV detection (percent or decimal)
    const ivCandidates = [
      p?.iv, p?.atmIv, p?.midIv, p?.ivPct, p?.iv_percent, p?.iv_percent_mid,
    ].filter((x: any) => typeof x === "number");

    if (!ivCandidates.length) continue;
    let iv = ivCandidates[0] as number;
    // If clearly a percent (e.g., 45 -> 45%), convert to decimal when > 1
    if (iv > 1) iv = iv / 100;

    // tAnnual detection
    let tAnnual: number | undefined =
      typeof p?.tAnnual === "number" ? p.tAnnual : undefined;

    if (tAnnual == null && typeof p?.dteDays === "number") {
      tAnnual = p.dteDays / 365;
    }
    if (tAnnual == null && typeof p?.days === "number") {
      tAnnual = p.days / 365;
    }
    if (tAnnual == null && (p?.expiryISO || p?.expiryTs)) {
      const expiryMs =
        typeof p?.expiryTs === "number"
          ? p.expiryTs
          : new Date(p.expiryISO).getTime();
      const dt = Math.max(expiryMs - now, 0);
      tAnnual = dt / DAY_MS / 365;
    }

    if (typeof tAnnual === "number" && isFinite(tAnnual) && tAnnual > 0) {
      pts.push({ tAnnual, iv });
    }
  }

  return pts.sort((a, b) => a.tAnnual - b.tAnnual);
}

/**
 * Interpolate IV in variance space between points.
 * Returns iv (decimal) at tTarget (years) or null if not possible.
 */
export function ivAtVarianceInterp(points: TsPoint[], tTarget: number): number | null {
  const pts = points.filter(p => isFinite(p.tAnnual) && isFinite(p.iv) && p.tAnnual > 0 && p.iv >= 0)
                    .sort((a, b) => a.tAnnual - b.tAnnual);
  if (!pts.length || !isFinite(tTarget) || tTarget <= 0) return null;
  if (tTarget <= pts[0].tAnnual) return pts[0].iv;
  if (tTarget >= pts[pts.length - 1].tAnnual) return pts[pts.length - 1].iv;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (tTarget >= a.tAnnual && tTarget <= b.tAnnual) {
      const Va = a.iv ** 2 * a.tAnnual;
      const Vb = b.iv ** 2 * b.tAnnual;
      const w = (tTarget - a.tAnnual) / (b.tAnnual - a.tAnnual);
      const Vt = Va + w * (Vb - Va);
      const iv = Math.sqrt(Vt / tTarget);
      return Number.isFinite(iv) ? iv : null;
    }
  }
  return null;
}
