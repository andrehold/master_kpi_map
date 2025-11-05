import { useCallback, useEffect, useMemo, useState } from "react";
import { useIVTermStructure } from "./useIVTermStructure";
import { getIndexPrice, type Currency } from "../services/deribit";

/**
 * useExpectedMove
 * EM = Spot × IV × √t
 * - IV(t) is interpolated in *variance space* from the term structure
 * - We also expose, for each tenor, the *closest real option expiry* used
 *   when interpolating (so you can show it next to the formula).
 */

export type TenorDef = { id: string; label: string; days: number };

export type ExpectedMoveItem = {
  id: string;
  label: string;
  days: number;
  em?: number;            // absolute expected move
  ivPct?: number;         // IV used (percent)
  // --- NEW: expiry metadata you can render in the UI ---
  expiryTs?: number;      // ms epoch (closest real expiry used)
  expiryISO?: string;     // ISO (if available from source)
  expiryLabel?: string;   // short UI label, e.g., "20 Jan"
  // optional: reveal interpolation source (left/right nodes)
  source?: {
    leftTs?: number;
    rightTs?: number;
    weightRight?: number; // 0..1 (weight of right node)
  };
};

export type UseExpectedMoveArgs = {
  currency?: Currency | "BTC" | "ETH";
  tenors?: readonly TenorDef[];
};

export type UseExpectedMoveResult = {
  data: {
    items: ExpectedMoveItem[];
    byId: Record<string, ExpectedMoveItem>;
    spot: number | null;
    tsAsOf: number | null; // ms epoch
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

// Default display set; adjust as you prefer
const DEFAULT_TENORS = [
  { id: "em-1d", label: "1D", days: 1 },
  { id: "em-1w", label: "1W", days: 7 },
  { id: "em-1m", label: "1M", days: 30 },
  { id: "em-3m", label: "3M", days: 90 },
] as const satisfies readonly TenorDef[];

export function useExpectedMove(
  { currency = "BTC", tenors = DEFAULT_TENORS }: UseExpectedMoveArgs = {}
): UseExpectedMoveResult {
  // 1) Term structure
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

  const normalizeDays = (days: number, label?: string, id?: string) => {
    const lid = (id ?? "").toLowerCase();
    const lbl = (label ?? "").toUpperCase();
    if (lbl === "3M" || /(^|-)3m$/.test(lid)) return 90;
    if (lbl === "1M" || /(^|-)1m$/.test(lid)) return 30;
    if (lbl === "1W" || /(^|-)1w$/.test(lid)) return 7;
    if (lbl === "1D" || /(^|-)1d$/.test(lid)) return 1;
    return days;
  };

  // 3) Compute EM set + expiry metadata
  const items = useMemo<ExpectedMoveItem[]>(() => {
    const pts = mapTsPoints(tsData?.points ?? []);
    return tenors.map((t) => {
      const days = normalizeDays(t.days, t.label, t.id);
      const tY = days / 365;
  
      const interp = interpolateIvVarianceWithSource(pts, tY);
      const iv = interp?.iv ?? null;
  
      const chosen = chooseExpiryForTarget(interp, days);
  
      if (spot != null && iv != null) {
        return {
          id: t.id, label: t.label, days,
          em: spot * iv * Math.sqrt(tY),
          ivPct: iv * 100,
          expiryTs: chosen?.ts,
          expiryISO: chosen?.iso,
          expiryLabel: chosen?.label,
          source: { leftTs: interp?.left?.expiryTs, rightTs: interp?.right?.expiryTs, weightRight: interp?.w },
        };
      }
      return {
        id: t.id, label: t.label, days,
        expiryTs: chosen?.ts,
        expiryISO: chosen?.iso,
        expiryLabel: chosen?.label,
        source: { leftTs: interp?.left?.expiryTs, rightTs: interp?.right?.expiryTs, weightRight: interp?.w },
      };
    });
  }, [tenors, tsData?.points, spot]);

  const byId = useMemo(() => {
    const m: Record<string, ExpectedMoveItem> = {};
    for (const it of items) m[it.id] = it;
    return m;
  }, [items]);

  const loading = tsLoading || spotLoading;
  const error = (tsError as string | null) || spotError || null;

  // Normalize asOf -> number | null
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

/* ------------------------- Helpers ------------------------------------- */

type TsPoint = {
  tAnnual: number;  // years
  iv: number;       // decimal
  expiryTs?: number;
  expiryISO?: string;
};

// Map various TS point shapes into normalized { tAnnual, iv, expiryTs?, expiryISO? }
export function mapTsPoints(raw: any[]): TsPoint[] {
  const now = Date.now();
  const DAY_MS = 24 * 3600 * 1000;
  const pts: TsPoint[] = [];

  for (const p of raw ?? []) {
    // IV detection (decimal or percent)
    const ivCandidates = [
      p?.iv, p?.atmIv, p?.midIv, p?.ivPct, p?.iv_percent, p?.iv_percent_mid,
    ].filter((x: any) => typeof x === "number");

    if (!ivCandidates.length) continue;
    let iv = ivCandidates[0] as number;
    if (iv > 1) iv = iv / 100; // treat as percent -> decimal

    // expiry fields if present
    let expiryTs: number | undefined = typeof p?.expiryTs === "number" ? p.expiryTs : undefined;
    const expiryISO: string | undefined = typeof p?.expiryISO === "string" ? p.expiryISO : undefined;
    if (expiryTs == null && expiryISO) {
      const ms = Date.parse(expiryISO);
      if (Number.isFinite(ms)) expiryTs = ms;
    }

    // tAnnual detection
    let tAnnual: number | undefined =
      typeof p?.tAnnual === "number" ? p.tAnnual : undefined;

    if (tAnnual == null && typeof p?.dteDays === "number") {
      tAnnual = p.dteDays / 365;
    }
    if (tAnnual == null && typeof p?.days === "number") {
      tAnnual = p.days / 365;
      // if we don't have an expiry but do have days, synthesize expiry from now
      if (expiryTs == null && Number.isFinite(p.days)) {
        expiryTs = now + p.days * DAY_MS;
      }
    }
    if (tAnnual == null && (expiryTs != null)) {
      const dt = Math.max(expiryTs - now, 0);
      tAnnual = dt / DAY_MS / 365;
    }

    if (typeof tAnnual === "number" && isFinite(tAnnual) && tAnnual > 0) {
      pts.push({ tAnnual, iv, expiryTs, expiryISO });
    }
  }

  return pts.sort((a, b) => a.tAnnual - b.tAnnual);
}

// Interpolate in total variance V = iv^2 * t, but also return the source nodes
export function interpolateIvVarianceWithSource(
  points: TsPoint[],
  tTarget: number
): { iv: number | null; left?: TsPoint; right?: TsPoint; w?: number } | null {
  if (!Number.isFinite(tTarget) || tTarget <= 0) return { iv: null };

  const pts = (points ?? [])
    .filter(p =>
      typeof p?.tAnnual === "number" && isFinite(p.tAnnual) && p.tAnnual > 0 &&
      typeof p?.iv === "number" && isFinite(p.iv) && p.iv >= 0
    )
    .sort((a, b) => a.tAnnual - b.tAnnual);

  if (!pts.length) return { iv: null };

  // ✅ Flat IV extrapolation outside the curve (don’t damp long-end IV)
  if (tTarget <= pts[0].tAnnual) {
    return { iv: pts[0].iv, left: pts[0], right: undefined, w: 0 };
  }
  if (tTarget >= pts[pts.length - 1].tAnnual) {
    const last = pts[pts.length - 1];
    return { iv: last.iv, left: last, right: undefined, w: 0 };
  }

  // Inside the curve: linear in total variance
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (tTarget >= a.tAnnual && tTarget <= b.tAnnual) {
      const Va = a.iv * a.iv * a.tAnnual;
      const Vb = b.iv * b.iv * b.tAnnual;
      const w = (tTarget - a.tAnnual) / (b.tAnnual - a.tAnnual); // weight of right node
      const Vt = Va + w * (Vb - Va);
      const iv = Math.sqrt(Vt / tTarget);
      return { iv: Number.isFinite(iv) ? iv : null, left: a, right: b, w };
    }
  }
  return { iv: null };
}


// Convenience: original scalar version if other code calls it
export function interpolateIvVariance(points: TsPoint[], tTarget: number): number | null {
  const r = interpolateIvVarianceWithSource(points, tTarget);
  return r?.iv ?? null;
}

// Choose a single expiry label for UI (nearest of the bracket nodes).
function chooseExpiryForTarget(
  interp: { left?: TsPoint; right?: TsPoint; w?: number } | null | undefined,
  targetDays: number
): { ts: number; iso?: string; label: string } | null {
  const now = Date.now();
  const DAY_MS = 24 * 3600 * 1000;

  if (!interp) return null;

  // Prefer the nearer node by weight; fall back carefully
  let ts: number | undefined;
  let iso: string | undefined;

  if (interp.left?.expiryTs != null && interp.right?.expiryTs != null && typeof interp.w === "number") {
    // w is weight of the right node; nearer node is (w >= 0.5 ? right : left)
    const chooseRight = interp.w >= 0.5;
    ts = chooseRight ? interp.right.expiryTs! : interp.left.expiryTs!;
    iso = chooseRight ? interp.right.expiryISO : interp.left.expiryISO;
  } else {
    ts = interp.left?.expiryTs ?? interp.right?.expiryTs;
    iso = interp.left?.expiryISO ?? interp.right?.expiryISO;
  }

  // If we still don't have a timestamp, synthesize from the target tenor
  if (ts == null) {
    ts = now + targetDays * DAY_MS;
  }

  const d = new Date(ts);
  const label = d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  return { ts, iso, label };
}
