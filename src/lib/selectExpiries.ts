// src/lib/expiry/selectExpiries.ts

/* =========================
 * Expiry selection helpers
 * ========================= */

export type SelectExpiriesOptions = {
  /** Max expiries to keep in the curve. */
  maxExpiries: number;
  /** Keep all expiries inside this horizon exactly (in days); collapse only beyond it. */
  nearDays?: number; // default 14
  /** Guarantee at least this many monthly expiries at the far end are kept. */
  minMonthly?: number; // default 3
};

/**
 * Select expiries from a Map where the key is expiry timestamp (ms epoch)
 * and the value is an array of instruments for that expiry.
 *
 * • Keeps all near-term expiries ≤ nearDays.
 * • Beyond nearDays, collapses to the *last expiry per UTC month* (monthly > weekly).
 * • **Reserves** at least `minMonthly` far-monthly expiries so long tenors (e.g. 3M)
 *   always have proper brackets even if many near weeklies exist.
 * • Returns ascending timestamps, capped at `maxExpiries`.
 */
export function selectExpiriesByHorizon<T>(
  groups: Map<number, T[]>,
  opts: SelectExpiriesOptions
): number[] {
  const now = Date.now();
  const DAY_MS = 86_400_000;

  const maxExpiries = Math.max(1, opts.maxExpiries ?? 6);
  const nearDays = opts.nearDays ?? 14;
  const minMonthly = Math.max(0, opts.minMonthly ?? 3);

  const sortedTs = Array.from(groups.keys()).sort((a, b) => a - b);
  const near: number[] = [];
  const farCandidates: number[] = [];

  for (const ts of sortedTs) {
    const dtDays = (ts - now) / DAY_MS;
    if (dtDays <= nearDays) near.push(ts);
    else farCandidates.push(ts);
  }

  // Collapse far candidates to last-of-month (UTC)
  const byMonth = new Map<string, number>();
  for (const ts of farCandidates) {
    const d = new Date(ts);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const prev = byMonth.get(key);
    if (prev == null || ts > prev) byMonth.set(key, ts);
  }
  const farMonthly = Array.from(byMonth.values()).sort((a, b) => a - b);

  // Reserve tail monthlies
  const nearLimit = Math.max(0, maxExpiries - Math.min(minMonthly, farMonthly.length));
  const nearUsed = Math.min(near.length, nearLimit);

  const out: number[] = [];
  for (let i = 0; i < nearUsed; i++) out.push(near[i]);

  const reservedCount = Math.min(minMonthly, farMonthly.length);
  for (let i = 0; i < reservedCount; i++) out.push(farMonthly[i]);

  // Fill remaining with more monthlies
  let i = reservedCount;
  while (out.length < maxExpiries && i < farMonthly.length) out.push(farMonthly[i++]);

  return Array.from(new Set(out)).sort((a, b) => a - b).slice(0, maxExpiries);
}

/** Smallest expiry ≥ (now + targetDays). Returns null if none found. */
export function ceilExpiry(
  expiries: number[],
  targetDays: number,
  opts?: { toleranceDays?: number }
): number | null {
  const now = Date.now();
  const DAY_MS = 86_400_000;
  const tol = Math.max(0, opts?.toleranceDays ?? 0); // optional slack
  const targetTs = now + (targetDays - tol) * DAY_MS;

  for (const ts of expiries.slice().sort((a, b) => a - b)) {
    if (ts >= targetTs) return ts;
  }
  return null;
}

/**
 * Pick the expiry to *display* for a tenor:
 * 1) If `curveExpiries` is provided, choose the **first expiry ≥ target** (ceil-of-target).
 * 2) Else, prefer the **right bracket** if available; fall back to left/nearest.
 * 3) If the chosen expiry is far beyond the tenor, synthesize `now + targetDays`.
 */
export function pickExpiryForTarget(
  targetDays: number,
  bracket: { leftTs?: number; rightTs?: number; weightRight?: number } | null | undefined,
  curveExpiries?: number[],
  opts?: { farThresholdDays?: number; toleranceDays?: number }
): { ts: number; label: string } {
  const now = Date.now();
  const DAY_MS = 86_400_000;
  const farThreshold = Math.max(2 * targetDays, opts?.farThresholdDays ?? 10);

  // 1) Prefer true ceil if we have the curve expiries
  if (Array.isArray(curveExpiries) && curveExpiries.length) {
    const ce = ceilExpiry(curveExpiries, targetDays, { toleranceDays: opts?.toleranceDays });
    if (ce != null) {
      const d = new Date(ce);
      return { ts: ce, label: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) };
    }
  }

  // 2) Fall back to bracket with a *right-side bias*
  let ts: number | undefined;
  if (bracket?.rightTs != null) ts = bracket.rightTs;
  else if (bracket?.leftTs != null) ts = bracket.leftTs;

  // 3) If far beyond tenor, synthesize near date
  if (ts != null) {
    const dtDays = (ts - now) / DAY_MS;
    if (dtDays > farThreshold) ts = now + targetDays * DAY_MS;
  } else {
    ts = now + targetDays * DAY_MS;
  }

  const d = new Date(ts);
  return { ts, label: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) };
}

/* ==========================================
 * ATM term construction & interpolation
 * ========================================== */

export type AtmInstrument = {
  strike?: number;
  // any of these IV fields might be present; function picks in priority order
  markIvPct?: number;  // percent, e.g. 45.2
  markIv?: number;     // decimal, e.g. 0.452
  ivBidPct?: number;
  ivAskPct?: number;
  ivBid?: number;
  ivAsk?: number;
};

export type DeribitExpiryGroup<T = AtmInstrument> = {
  expiryTs: number;      // ms epoch
  instruments: T[];      // calls/puts for that expiry
};

export type BuildAtmTermOptions = {
  spot: number;
  r?: number;            // risk-free (annualized, decimal)
  q?: number;            // dividend/yield/borrow (annualized, decimal)
  dayCount?: 365 | 252;  // ACT/365 default
};

export type TsPoint = {
  tAnnual: number;  // years
  iv: number;       // decimal
  expiryTs?: number;
};

export type AtmTermResult = {
  points: TsPoint[];      // sorted by tAnnual
  expiries: number[];     // unique expiry timestamps used
};

/** Utility: best-effort IV mid (decimal) from instrument fields */
function ivMidDecimal(ins: AtmInstrument): number | null {
  const toDec = (x: number | undefined) => (typeof x === "number" ? (x > 1 ? x / 100 : x) : undefined);
  // prefer markIv / markIvPct
  const mark = toDec(ins.markIv ?? ins.markIvPct);
  if (typeof mark === "number") return mark;

  // else fall back to bid/ask average if available
  const bid = toDec(ins.ivBid ?? ins.ivBidPct);
  const ask = toDec(ins.ivAsk ?? ins.ivAskPct);
  if (typeof bid === "number" && typeof ask === "number") return (bid + ask) / 2;
  if (typeof bid === "number") return bid;
  if (typeof ask === "number") return ask;

  return null;
}

/** Forward from S*exp((r-q)*T); if r/q absent, forward≈spot */
function forwardFrom(S: number, T: number, r?: number, q?: number): number {
  if (typeof r !== "number" && typeof q !== "number") return S;
  const rr = typeof r === "number" ? r : 0;
  const qq = typeof q === "number" ? q : 0;
  return S * Math.exp((rr - qq) * T);
}

/** Build ATM-forward term: for each expiry, pick strike closest to forward, take mid IV at that strike */
export function buildAtmTermFromGroups<T extends AtmInstrument>(
  groups: DeribitExpiryGroup<T>[],
  opts: BuildAtmTermOptions
): AtmTermResult {
  const DAY_MS = 86_400_000;
  const dc = (opts.dayCount ?? 365) as 365 | 252;
  const now = Date.now();

  const points: TsPoint[] = [];
  const expiries: number[] = [];

  for (const g of groups ?? []) {
    if (!g || typeof g.expiryTs !== "number" || !Array.isArray(g.instruments)) continue;

    const dt = Math.max(0, g.expiryTs - now);
    const tAnnual = dt / DAY_MS / dc;
    if (!(tAnnual > 0)) continue;

    const F = forwardFrom(opts.spot, tAnnual, opts.r, opts.q);

    // pick instrument with strike closest to forward
    const best = g.instruments
      .filter((x) => typeof x?.strike === "number")
      .map((x) => ({ ins: x, dist: Math.abs((x.strike as number) - F) }))
      .sort((a, b) => a.dist - b.dist)[0]?.ins;

    if (!best) continue;

    const iv = ivMidDecimal(best);
    if (iv == null || !Number.isFinite(iv) || iv <= 0) continue;

    points.push({ tAnnual, iv, expiryTs: g.expiryTs });
    expiries.push(g.expiryTs);
  }

  points.sort((a, b) => a.tAnnual - b.tAnnual);
  const uniqExpiries = Array.from(new Set(expiries)).sort((a, b) => a - b);

  return { points, expiries: uniqExpiries };
}

/* ============================
 * Interpolation & EM
 * ============================ */

export function interpolateIvVarianceWithSource(
  points: TsPoint[],
  tTarget: number
): { iv: number | null; left?: TsPoint; right?: TsPoint; w?: number } {
  const pts = (points ?? [])
    .filter(p => typeof p?.tAnnual === "number" && p.tAnnual > 0 && typeof p?.iv === "number" && p.iv >= 0)
    .sort((a, b) => a.tAnnual - b.tAnnual);

  if (!pts.length || !(tTarget > 0) || !Number.isFinite(tTarget)) return { iv: null };

  // If only one point: T-scaling → IV stays constant
  if (pts.length === 1) return { iv: pts[0].iv, left: pts[0], right: undefined, w: 0 };

  // Inside the curve: linear in total variance (standard)
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

  // Outside the curve: extrapolate *forward variance* using slope of far end
  if (tTarget < pts[0].tAnnual) {
    const a = pts[0], b = pts[1];
    const Va = a.iv * a.iv * a.tAnnual;
    const Vb = b.iv * b.iv * b.tAnnual;
    const slope = (Vb - Va) / (b.tAnnual - a.tAnnual);
    const Vt = Va + slope * (tTarget - a.tAnnual);
    const iv = Math.sqrt(Math.max(Vt, 0) / tTarget);
    return { iv: Number.isFinite(iv) ? iv : null, left: a, right: b, w: 0 };
  } else {
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const Va = a.iv * a.iv * a.tAnnual;
    const Vb = b.iv * b.iv * b.tAnnual;
    const slope = (Vb - Va) / (b.tAnnual - a.tAnnual);
    const Vt = Vb + slope * (tTarget - b.tAnnual);
    const iv = Math.sqrt(Math.max(Vt, 0) / tTarget);
    return { iv: Number.isFinite(iv) ? iv : null, left: a, right: b, w: 1 };
  }
}

export function expectedMove(spot: number, ivDecimal: number, tAnnual: number): { em: number; sqrtT: number } {
  const sqrtT = Math.sqrt(tAnnual);
  return { em: spot * ivDecimal * sqrtT, sqrtT };
}
