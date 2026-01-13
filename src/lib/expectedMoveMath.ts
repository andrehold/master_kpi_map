// src/lib/expectedMoveMath.ts

export type ExpectedMoveRow = {
    days: number;
    expiryTs: number | null;
    abs: number | null; // $ move
    pct: number | null; // decimal (0.05 = 5%)
  };
  
  export type ExpectedMovePointLike = Record<string, any>;
  
  export type ExpectedMoveStateLike = {
    asOf?: number | string | null;
    currency?: string;
    indexPrice?: number | null; // spot
    spot?: number | null;
    price?: number | null;
  
    // common domain shape you showed:
    points?: ExpectedMovePointLike[] | null;
    em?: number | null; // primary tenor expected move (usually abs $)
  
    // sometimes already normalized:
    rows?: ExpectedMoveRow[] | null;
  
    loading?: boolean;
    error?: unknown;
  };
  
  export type PickedExpectedMove = {
    days: number;
    asOf: number | string | null;
    spot: number | null;
    expiryTs: number | null;
  
    emAbs: number | null;   // $ move
    emPct: number | null;   // decimal
    ivAnnDec: number | null; // annualized IV decimal (0.55 = 55%)
  
    source: "point" | "state" | "none";
  };
  
  const isNum = (x: any): x is number => typeof x === "number" && Number.isFinite(x);
  
  function pickNum(...xs: any[]): number | undefined {
    for (const x of xs) if (isNum(x)) return x;
    return undefined;
  }
  
  export function sqrtYearFracFromDays(days: number): number {
    return Math.sqrt(Math.max(0, days) / 365);
  }
  
  export function emAbsFromSpotIv(spot: number, ivAnnDec: number, days: number): number {
    return spot * ivAnnDec * sqrtYearFracFromDays(days);
  }
  
  export function emPctFromIv(ivAnnDec: number, days: number): number {
    return ivAnnDec * sqrtYearFracFromDays(days);
  }
  
  export function ivAnnFromEmAbs(emAbs: number, spot: number, days: number): number {
    return emAbs / (spot * sqrtYearFracFromDays(days));
  }
  
  export function ivAnnFromEmPct(emPct: number, days: number): number {
    return emPct / sqrtYearFracFromDays(days);
  }
  
  /** Accept Deribit mark_iv as percent (45.8) or decimal (0.458). Returns decimal. */
  export function normalizeIvDec(iv: number | null | undefined): number | null {
    if (!isNum(iv)) return null;
    if (iv > 2) return iv / 100;
    return iv;
  }
  
  function pointDays(p: ExpectedMovePointLike): number | null {
    const d = pickNum(p?.days, p?.horizonDays, p?.tenorDays, p?.d, p?.tDays);
    return isNum(d) ? d : null;
  }
  
  function pickClosestPoint(points: ExpectedMovePointLike[], days: number): ExpectedMovePointLike | null {
    if (!points.length) return null;
  
    // exact match first
    const exact = points.find((p) => pointDays(p) === days);
    if (exact) return exact;
  
    // else closest
    let best: ExpectedMovePointLike | null = null;
    let bestDist = Infinity;
  
    for (const p of points) {
      const d = pointDays(p);
      if (d == null) continue;
      const dist = Math.abs(d - days);
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    return best;
  }
  
  function interpretEmValue(emVal: number, spot: number | null): { emAbs: number | null; emPct: number | null } {
    if (!isNum(emVal)) return { emAbs: null, emPct: null };
  
    // Heuristic:
    // - if spot is "large" and emVal is small (<~3), it's probably a pct (0.06 = 6%)
    // - otherwise treat as absolute dollars
    if (spot != null && spot > 20 && emVal <= 3) {
      return { emAbs: spot * emVal, emPct: emVal };
    }
    return { emAbs: emVal, emPct: spot != null && spot > 0 ? emVal / spot : null };
  }
  
  /**
   * Adapter: pick a usable EM bundle for a given horizonDays.
   *
   * Priority:
   * 1) matching/closest `points[]` entry
   * 2) fallback to top-level `state.em` + `state.indexPrice`
   * 3) infer IV from EM if IV not provided
   */
  export function pickEmForDays(
    state: ExpectedMoveStateLike | null | undefined,
    days: number
  ): PickedExpectedMove {
    const asOf = (state?.asOf ?? null) as any;
  
    const points = Array.isArray(state?.points) ? state!.points! : [];
    const p = pickClosestPoint(points, days);
  
    const spot = pickNum(
      p?.indexPrice,
      p?.spot,
      p?.price,
      state?.indexPrice,
      state?.spot,
      state?.price
    ) ?? null;
  
    const expiryTs =
      pickNum(p?.expiryTs, p?.expirationTs, p?.expiration_timestamp, p?.expiry, p?.expiration) ?? null;
  
    // Try to get abs/pct explicitly from point/rows-style fields
    const abs0 = pickNum(p?.abs, p?.emAbs, p?.expectedMoveAbs, p?.expectedMoveUsd, p?.moveUsd);
    const pct0 = pickNum(p?.pct, p?.emPct, p?.expectedMovePct, p?.movePct);
  
    // If there is a generic `em` value, interpret it (abs vs pct)
    const emVal = pickNum(p?.em, state?.em);
    const emInterp = isNum(emVal) ? interpretEmValue(emVal, spot) : { emAbs: null, emPct: null };
  
    let emAbs = abs0 ?? emInterp.emAbs;
    let emPct = pct0 ?? emInterp.emPct;
  
    // Fill missing side using spot
    if (emAbs == null && emPct != null && spot != null) emAbs = spot * emPct;
    if (emPct == null && emAbs != null && spot != null && spot > 0) emPct = emAbs / spot;
  
    // Try IV if present, else infer from emAbs/spot
    const ivRaw = pickNum(p?.iv, p?.atmIv, p?.markIv, p?.mark_iv, state as any);
    const iv0 = normalizeIvDec(ivRaw);
  
    const ivAnnDec =
      iv0 ??
      (emAbs != null && spot != null && spot > 0
        ? ivAnnFromEmAbs(emAbs, spot, days)
        : null);
  
    const source: PickedExpectedMove["source"] = p ? "point" : (state?.em != null ? "state" : "none");
  
    return {
      days,
      asOf,
      spot,
      expiryTs,
      emAbs: emAbs ?? null,
      emPct: emPct ?? null,
      ivAnnDec,
      source,
    };
  }
  
  /**
   * Normalize an expectedMove state to the ribbon-friendly rows format.
   * - If `state.rows` exists, returns it.
   * - Else maps `points` to {days, expiryTs, abs, pct}.
   */
  export function toExpectedMoveRows(
    state: ExpectedMoveStateLike | null | undefined
  ): ExpectedMoveRow[] {
    const rows = state?.rows;
    if (Array.isArray(rows) && rows.length) return rows;
  
    const points = Array.isArray(state?.points) ? state!.points! : [];
    if (!points.length) return [];
  
    const out: ExpectedMoveRow[] = [];
  
    for (const p of points) {
      const d = pointDays(p);
      if (d == null) continue;
  
      const spot = pickNum(p?.indexPrice, p?.spot, p?.price, state?.indexPrice, state?.spot, state?.price) ?? null;
  
      const abs0 = pickNum(p?.abs, p?.emAbs, p?.expectedMoveAbs, p?.expectedMoveUsd, p?.moveUsd);
      const pct0 = pickNum(p?.pct, p?.emPct, p?.expectedMovePct, p?.movePct);
  
      const emVal = pickNum(p?.em);
      const emInterp = isNum(emVal) ? interpretEmValue(emVal, spot) : { emAbs: null, emPct: null };
  
      let abs = abs0 ?? emInterp.emAbs;
      let pct = pct0 ?? emInterp.emPct;
  
      if (abs == null && pct != null && spot != null) abs = spot * pct;
      if (pct == null && abs != null && spot != null && spot > 0) pct = abs / spot;
  
      const expiryTs =
        pickNum(p?.expiryTs, p?.expirationTs, p?.expiration_timestamp, p?.expiry, p?.expiration) ?? null;
  
      out.push({
        days: d,
        expiryTs,
        abs: abs ?? null,
        pct: pct ?? null,
      });
    }
  
    return out.sort((a, b) => a.days - b.days);
  }
  