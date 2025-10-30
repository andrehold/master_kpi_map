// src/lib/ivTerm.ts
import type { IVPoint } from "../services/deribit";

export type IVTermStructureLabel =
  | "contango"
  | "backwardation"
  | "flat"
  | "insufficient";

/** OLS slope of IV (y) vs time-to-maturity in years (x). IV is decimal (0.55 = 55%). */
export function linregSlope(ttmYears: number[], ivs: number[]): number | null {
  const n = Math.min(ttmYears.length, ivs.length);
  if (n < 2) return null;
  const mx = ttmYears.reduce((a, b) => a + b, 0) / n;
  const my = ivs.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const dx = ttmYears[i] - mx;
    num += dx * (ivs[i] - my);
    den += dx * dx;
  }
  return den === 0 ? null : num / den; // units: IV per 1.0 year
}

/** Turn slope/premium into a label with a small tolerance to avoid noise flips. */
export function classifyTermStructure(
  slopePerYear: number | null,
  termPremium: number | null,
  eps: number = 0.005 // ≈ 0.5 vol pts / year
): IVTermStructureLabel {
  if (slopePerYear == null || termPremium == null) return "insufficient";
  if (slopePerYear > eps && termPremium > 0) return "contango";
  if (slopePerYear < -eps && termPremium < 0) return "backwardation";
  return "flat";
}

/** Compute stats from already-built ATM IV points. */
export function getTermStructureStats(points: IVPoint[]): {
  n: number;
  slopePerYear: number | null;
  termPremium: number | null;
  label: IVTermStructureLabel;
} {
  const usable = points
    .filter(p => typeof p.iv === "number" && isFinite(p.iv as number) && p.ttmY > 0)
    .sort((a, b) => a.dte - b.dte);

  const n = usable.length;
  if (n < 2) {
    return { n, slopePerYear: null, termPremium: null, label: "insufficient" };
  }

  const slopePerYear = linregSlope(
    usable.map(p => p.ttmY),
    usable.map(p => p.iv as number)
  );

  const termPremium = (usable[n - 1].iv as number) - (usable[0].iv as number);
  const label = classifyTermStructure(slopePerYear, termPremium);

  return { n, slopePerYear, termPremium, label };
}
