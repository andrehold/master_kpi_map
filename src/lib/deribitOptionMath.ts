// src/lib/deribitOptionMath.ts
import type { DeribitInstrument } from "../services/deribit";

export type OptionType = "call" | "put";

/**
 * Normalize Deribit IV fields (which can be decimals like 0.45 or percents like 45)
 * into a decimal representation. Returns undefined for invalid inputs.
 */
export function normalizeDeribitIv(raw?: number | null): number | undefined {
  if (typeof raw !== "number" || !isFinite(raw) || raw <= 0) return undefined;
  if (raw >= 1000) return undefined; // reject obviously broken values
  if (raw > 5) return raw / 100;     // treat >500% annualized as percent
  return raw;
}

/**
 * Pick the instrument whose strike is closest to the target. Assumes each entry has a numeric
 * `strike` field. Returns undefined if no eligible instruments exist.
 */
export function pickNearestStrike<T extends { strike?: number | null }>(
  list: T[],
  target: number
): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  for (const item of list) {
    const strike = typeof item?.strike === "number" ? item.strike : undefined;
    if (strike == null || !isFinite(strike)) continue;
    const dist = Math.abs(strike - target);
    if (dist < bestDist) {
      best = item;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Convenience wrapper for Deribit instruments: filter by option_type first, then pick the nearest strike.
 */
export function pickNearestInstrumentByType(
  chain: DeribitInstrument[],
  optionType: OptionType,
  targetStrike: number
): DeribitInstrument | undefined {
  const filtered = chain.filter(
    (i) => i.option_type === optionType && typeof i?.strike === "number"
  );
  return pickNearestStrike(filtered, targetStrike);
}

