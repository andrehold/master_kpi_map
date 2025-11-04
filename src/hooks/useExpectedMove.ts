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
  em?: number; // absolute move
  ivPct?: number; // IV in % (e.g., 52.4)
};

export type UseExpectedMoveArgs = {
  currency?: Currency; // default BTC
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

export function useExpectedMove({ currency = "BTC", tenors = DEFAULT_TENORS }: UseExpectedMoveArgs = {}): UseExpectedMoveResult {
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
      setSpot(px);
      setSpotError(null);
    } catch (e: any) {
      setSpotError(e?.message ?? String(e));
    } finally {
      setSpotLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    fetchSpot();
  }, [fetchSpot]);

  // 3) Compute EM set
  const items = useMemo<ExpectedMoveItem[]>(() => {
    const pts = mapTsPoints(tsData?.points ?? []);
    return tenors.map((t) => {
      const tY = t.days / 365;
      const iv = interpolateIvVariance(pts, tY); // decimal
      if (spot != null && iv != null) {
        return { id: t.id, label: t.label, days: t.days, em: spot * iv * Math.sqrt(tY), ivPct: iv * 100 };
      }
      return { id: t.id, label: t.label, days: t.days };
    });
  }, [tenors, tsData?.points, spot]);

  // 4) API shape
  const loading = tsLoading || spotLoading;
  const error = (tsError as string | null) || spotError || null;
  const tsAsOf = (tsData?.asOf as number | undefined) ?? null;

  const refresh = useCallback(async () => {
    await Promise.allSettled([fetchSpot(), reload?.() ?? Promise.resolve()]);
  }, [fetchSpot, reload]);

  const byId = useMemo(() => {
    const m: Record<string, ExpectedMoveItem> = {};
    for (const it of items) m[it.id] = it;
    return m;
  }, [items]);

  return {
    data: { items, byId, spot, tsAsOf },
    loading,
    error,
    refresh,
  };
}

// ----------------------- Helpers (shared with UI) ---------------------------

type TsPoint = { tAnnual: number; iv: number };

// Map various TS point shapes into { tAnnual, iv }
export function mapTsPoints(raw: any[]): TsPoint[] {
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const pts: TsPoint[] = [];
  for (const p of raw ?? []) {
    const iv = [p?.iv, p?.atmIv, p?.midIv].find((x: any) => typeof x === "number");
    let t = typeof p?.tAnnual === "number" ? p.tAnnual : undefined;
    if (t == null && typeof p?.dteDays === "number") t = p.dteDays / 365;
    if (t == null && p?.expiryISO) {
      const dt = new Date(p.expiryISO).getTime() - now;
      t = Math.max(dt / DAY / 365, 0);
    }
    if (typeof iv === "number" && typeof t === "number" && isFinite(iv) && isFinite(t) && t > 0) {
      pts.push({ tAnnual: t, iv });
    }
  }
  return pts.sort((a, b) => a.tAnnual - b.tAnnual);
}

// Interpolate linearly in total variance space: V = iv^2 * t
export function interpolateIvVariance(points: TsPoint[], tTarget: number): number | null {
  if (!points.length) return null;
  const pts = points;
  if (tTarget <= pts[0].tAnnual) {
    const iv = Math.sqrt((pts[0].iv ** 2 * pts[0].tAnnual) / Math.max(tTarget, 1e-6));
    return isFinite(iv) ? iv : null;
  }
  if (tTarget >= pts[pts.length - 1].tAnnual) {
    const last = pts[pts.length - 1];
    const iv = Math.sqrt((last.iv ** 2 * last.tAnnual) / tTarget);
    return isFinite(iv) ? iv : null;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (tTarget >= a.tAnnual && tTarget <= b.tAnnual) {
      const Va = a.iv ** 2 * a.tAnnual;
      const Vb = b.iv ** 2 * b.tAnnual;
      const w = (tTarget - a.tAnnual) / (b.tAnnual - a.tAnnual);
      const Vt = Va + w * (Vb - Va);
      const iv = Math.sqrt(Vt / tTarget);
      return isFinite(iv) ? iv : null;
    }
  }
  return null;
}
