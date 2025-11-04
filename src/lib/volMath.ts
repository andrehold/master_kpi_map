// src/lib/volMath.ts
export const DAYS_IN_YEAR = 365;

// Convert a tenor in days to years with a consistent base (calendar-year default)
export function toYears(days: number, base: number = DAYS_IN_YEAR) {
  return days / base;
}

// Year fraction between two timestamps (ISO strings or Date)
export function yearsBetween(asOfISO: string | number | Date, expiryISO: string, base: number = DAYS_IN_YEAR) {
  const a = new Date(asOfISO).getTime();
  const b = new Date(expiryISO).getTime();
  if (!isFinite(a) || !isFinite(b)) return NaN;
  const MS_IN_YEAR = base * 24 * 60 * 60 * 1000;
  return Math.max(0, (b - a) / MS_IN_YEAR);
}

// Linear interpolation in **variance** space: V = iv^2 * t
// points: [{ t: years ( >0 ), iv: annualized decimal ( >=0 ) }]
export function varianceInterpIV(
  points: { t: number; iv: number }[],
  tTarget: number
): number | null {
  const pts = points
    .filter(p => isFinite(p.t) && p.t > 0 && isFinite(p.iv) && p.iv >= 0)
    .sort((a, b) => a.t - b.t);

  if (!pts.length || !isFinite(tTarget) || tTarget <= 0) return null;

  // clamp to edges
  if (tTarget <= pts[0].t) return pts[0].iv;
  if (tTarget >= pts[pts.length - 1].t) return pts[pts.length - 1].iv;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (tTarget >= a.t && tTarget <= b.t) {
      const Va = a.iv * a.iv * a.t;
      const Vb = b.iv * b.iv * b.t;
      const w  = (tTarget - a.t) / (b.t - a.t);
      const Vt = Va + w * (Vb - Va);
      const iv = Math.sqrt(Vt / tTarget);
      return Number.isFinite(iv) ? iv : null;
    }
  }
  return null;
}

// Convert annualized sigma to period sigma using tYears
export function periodFromAnnual(annualSigma: number, tYears: number) {
  return annualSigma * Math.sqrt(tYears);
}

// Convert period sigma to annualized sigma
export function annualFromPeriod(periodSigma: number, tYears: number) {
  if (!isFinite(tYears) || tYears <= 0) return NaN;
  return periodSigma / Math.sqrt(tYears);
}

// Safe divide for ratios
export function safeRatio(num?: number | null, den?: number | null) {
  if (num == null || den == null || !isFinite(num) || !isFinite(den) || den === 0) return undefined;
  return num / den;
}

// Convenience: compute RV÷EM factor from annualized RV and annualized IV (same tenor basis)
export function rvEmFactorFromAnn(rvAnn?: number | null, ivAnn?: number | null) {
  const r = safeRatio(rvAnn ?? undefined, ivAnn ?? undefined);
  return r;
}

// Build points for variance interpolation directly from term-structure data
export function buildTsPointsFromExpiries(
  asOfISO: string,
  expiries: { expiryISO: string; iv: number | null | undefined }[],
  base: number = DAYS_IN_YEAR
) {
  return expiries
    .map(p => ({
      t: yearsBetween(asOfISO, p.expiryISO, base),
      iv: typeof p.iv === "number" ? p.iv : NaN,
    }))
    .filter(p => isFinite(p.t) && p.t > 0 && isFinite(p.iv) && p.iv >= 0)
    .sort((a, b) => a.t - b.t);
}

// Convenience: compute annualized IV at targetDays from term-structure
export function ivAnnFromTermStructure(
  tsData: { asOf?: string; points?: { expiryISO?: string; iv?: number | null }[] } | null | undefined,
  targetDays: number,
  base: number = DAYS_IN_YEAR
): number | null {
  if (!tsData?.asOf || !tsData?.points?.length || targetDays <= 0) return null;
  const tTarget = toYears(targetDays, base);
  const pts = buildTsPointsFromExpiries(
    tsData.asOf,
    tsData.points.map(p => ({ expiryISO: p.expiryISO!, iv: p.iv ?? null })),
    base
  );
  return varianceInterpIV(pts, tTarget);
}
