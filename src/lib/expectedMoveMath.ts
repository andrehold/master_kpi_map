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
  
    // spot aliases
    indexPrice?: number | null;
    spot?: number | null;
    price?: number | null;
  
    // curve points (preferred)
    points?: ExpectedMovePointLike[] | null;
  
    // IMPORTANT: can be number OR object OR tenor-map depending on your domain hook
    em?: unknown;
  
    // sometimes already normalized
    rows?: ExpectedMoveRow[] | null;
  
    loading?: boolean;
    error?: unknown;
  };
  
  export type PickedExpectedMove = {
    days: number;
    asOf: number | string | null;
    spot: number | null;
    expiryTs: number | null;
  
    emAbs: number | null; // $ move
    emPct: number | null; // decimal
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
  
  function parseTenorToDays(s: string): number | null {
    const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*([DWM])$/i);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    const u = m[2].toUpperCase();
    if (u === "D") return Math.round(n);
    if (u === "W") return Math.round(n * 7);
    if (u === "M") return Math.round(n * 30);
    return null;
  }
  
  function pointDays(p: ExpectedMovePointLike): number | null {
    const d = pickNum(p?.days, p?.horizonDays, p?.tenorDays, p?.d, p?.tDays, p?.dte);
    if (isNum(d)) return d;
  
    const label =
      (typeof p?.tenor === "string" && p.tenor) ||
      (typeof p?.label === "string" && p.label) ||
      (typeof p?.term === "string" && p.term) ||
      (typeof p?.name === "string" && p.name) ||
      null;
  
    if (label) return parseTenorToDays(label);
    return null;
  }
  
  function pickClosestPoint(points: ExpectedMovePointLike[], days: number): ExpectedMovePointLike | null {
    if (!points.length) return null;
  
    const exact = points.find((p) => pointDays(p) === days);
    if (exact) return exact;
  
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
  
  function interpretEmNumber(
    emVal: number,
    spot: number | null
  ): { emAbs: number | null; emPct: number | null } {
    if (!isNum(emVal)) return { emAbs: null, emPct: null };
  
    // Heuristics for BTC/ETH:
    // - <= 3 : likely decimal pct (0.06 = 6%)
    // - 3..150 : often percent pct (6 = 6%)
    // - else : absolute dollars
    if (spot != null && spot > 20) {
      if (emVal <= 3) {
        return { emAbs: spot * emVal, emPct: emVal };
      }
      if (emVal <= 150) {
        const pct = emVal / 100;
        return { emAbs: spot * pct, emPct: pct };
      }
    }
  
    return { emAbs: emVal, emPct: spot != null && spot > 0 ? emVal / spot : null };
  }
  
  function interpretEmObject(
    emObj: any,
    spot: number | null
  ): { emAbs: number | null; emPct: number | null } {
    if (!emObj || typeof emObj !== "object") return { emAbs: null, emPct: null };
  
    // direct abs/pct fields
    const abs = pickNum(
      emObj.abs,
      emObj.emAbs,
      emObj.expectedMoveAbs,
      emObj.expectedMoveUsd,
      emObj.moveUsd,
      emObj.moveAbs,
      emObj.usd
    );
  
    const pct = pickNum(
      emObj.pct,
      emObj.emPct,
      emObj.expectedMovePct,
      emObj.movePct,
      emObj.pctMove
    );
  
    if (abs != null || pct != null) {
      return {
        emAbs: abs ?? (pct != null && spot != null ? spot * pct : null),
        emPct: pct ?? (abs != null && spot != null && spot > 0 ? abs / spot : null),
      };
    }
  
    // common single-value containers
    const v = pickNum(emObj.value, emObj.em, emObj.move, emObj.expectedMove);
    if (v != null) return interpretEmNumber(v, spot);
  
    return { emAbs: null, emPct: null };
  }
  
  function pickFromTenorMap(
    emMap: Record<string, any>,
    days: number,
    spot: number | null
  ): { emAbs: number | null; emPct: number | null } {
    // keys like "5D", "1W", "30D"
    const entries: Array<{ d: number; v: any }> = [];
    for (const [k, v] of Object.entries(emMap)) {
      const d = parseTenorToDays(k);
      if (d != null) entries.push({ d, v });
    }
    if (!entries.length) return { emAbs: null, emPct: null };
  
    // closest key
    let best = entries[0];
    let bestDist = Math.abs(best.d - days);
    for (const e of entries) {
      const dist = Math.abs(e.d - days);
      if (dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
  
    if (isNum(best.v)) return interpretEmNumber(best.v, spot);
    if (best.v && typeof best.v === "object") return interpretEmObject(best.v, spot);
    return { emAbs: null, emPct: null };
  }
  
  function interpretEmAny(
    emAny: any,
    days: number,
    spot: number | null
  ): { emAbs: number | null; emPct: number | null } {
    if (isNum(emAny)) return interpretEmNumber(emAny, spot);
  
    if (Array.isArray(emAny)) {
      // treat as points-like list
      const p = pickClosestPoint(emAny as any[], days);
      if (!p) return { emAbs: null, emPct: null };
  
      const abs0 = pickNum(p?.abs, p?.emAbs, p?.expectedMoveAbs, p?.expectedMoveUsd, p?.moveUsd);
      const pct0 = pickNum(p?.pct, p?.emPct, p?.expectedMovePct, p?.movePct);
  
      const spot2 = pickNum(p?.indexPrice, p?.spot, p?.price, spot) ?? null;
  
      const fromEm =
        p?.em != null ? interpretEmAny(p.em, days, spot2) : { emAbs: null, emPct: null };
  
      return {
        emAbs: abs0 ?? fromEm.emAbs,
        emPct: pct0 ?? fromEm.emPct,
      };
    }
  
    if (emAny && typeof emAny === "object") {
      // if it looks like a tenor-map (keys like "5D"/"1W"), try that
      const tenorPicked = pickFromTenorMap(emAny as any, days, spot);
      if (tenorPicked.emAbs != null || tenorPicked.emPct != null) return tenorPicked;
  
      // otherwise interpret as object
      return interpretEmObject(emAny, spot);
    }
  
    return { emAbs: null, emPct: null };
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
  
    const spot =
      pickNum(p?.indexPrice, p?.spot, p?.price, state?.indexPrice, state?.spot, state?.price) ?? null;
  
    const expiryTs =
      pickNum(p?.expiryTs, p?.expirationTs, p?.expiration_timestamp, p?.expiry, p?.expiration) ?? null;
  
    // explicit abs/pct from point
    const abs0 = pickNum(p?.abs, p?.emAbs, p?.expectedMoveAbs, p?.expectedMoveUsd, p?.moveUsd);
    const pct0 = pickNum(p?.pct, p?.emPct, p?.expectedMovePct, p?.movePct);
  
    // interpret `em` from point or state (number/object/map/array)
    const fromEm = interpretEmAny(p?.em ?? state?.em, days, spot);
  
    let emAbs = abs0 ?? fromEm.emAbs;
    let emPct = pct0 ?? fromEm.emPct;
  
    if (emAbs == null && emPct != null && spot != null) emAbs = spot * emPct;
    if (emPct == null && emAbs != null && spot != null && spot > 0) emPct = emAbs / spot;
  
    // IV: prefer explicit if present, else infer from emPct (best), else from emAbs+spot
    const ivRaw = pickNum(
      // point-level
      p?.ivAnnDec,
      p?.ivAnn,
      p?.iv,
      p?.atmIv,
      p?.atm_iv,
      p?.markIv,
      p?.mark_iv,
      p?.atmMarkIv,
      p?.atm_mark_iv,
      // state-level
      (state as any)?.ivAnnDec,
      (state as any)?.ivAnn,
      (state as any)?.iv,
      (state as any)?.atmIv,
      (state as any)?.atm_iv,
      (state as any)?.markIv,
      (state as any)?.mark_iv
    );
  
    const iv0 = normalizeIvDec(ivRaw);
  
    const ivAnnDec =
      iv0 ??
      (emPct != null ? ivAnnFromEmPct(emPct, days) : null) ??
      (emAbs != null && spot != null && spot > 0 ? ivAnnFromEmAbs(emAbs, spot, days) : null);
  
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
  export function toExpectedMoveRows(state: ExpectedMoveStateLike | null | undefined): ExpectedMoveRow[] {
    const rows = state?.rows;
    if (Array.isArray(rows) && rows.length) return rows;
  
    const points = Array.isArray(state?.points) ? state!.points! : [];
    if (!points.length) return [];
  
    const out: ExpectedMoveRow[] = [];
  
    for (const p of points) {
      const d = pointDays(p);
      if (d == null) continue;
  
      const spot =
        pickNum(p?.indexPrice, p?.spot, p?.price, state?.indexPrice, state?.spot, state?.price) ?? null;
  
      const abs0 = pickNum(p?.abs, p?.emAbs, p?.expectedMoveAbs, p?.expectedMoveUsd, p?.moveUsd);
      const pct0 = pickNum(p?.pct, p?.emPct, p?.expectedMovePct, p?.movePct);
  
      const fromEm = interpretEmAny(p?.em, d, spot);
  
      let abs = abs0 ?? fromEm.emAbs;
      let pct = pct0 ?? fromEm.emPct;
  
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
  