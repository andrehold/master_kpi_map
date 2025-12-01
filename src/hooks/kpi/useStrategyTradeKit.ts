// src/hooks/model/useStrategyTradeKit.ts

import type { StrategyKey } from "../../data/kpis";
import type { TradeKitState } from "./useStrategyChecklist";

/**
 * Minimal empty TradeKitState – used as a safe default while we don’t have
 * per-strategy domain trade hooks wired yet.
 */
const EMPTY_TRADE_KIT: TradeKitState = {
  legs: [],
  summary: {},
  loading: false,
  error: null,
};

/**
 * View-model hook: returns a TradeKitState for the given strategy.
 *
 * RIGHT NOW:
 * - we don’t have domain hooks that describe the live position structure
 *   (legs, max profit/loss, etc.) for Horizon / Weekend / others.
 * - so this returns a stable empty object for every strategy.
 *
 * That’s enough for:
 *   - the checklist to render without errors
 *   - Global KPI + Pre-Trade rules to work
 *   - Trade Kit section to show a helpful “not wired yet” message
 *
 * LATER:
 *   - you can switch on `strategyKey` and call real domain hooks here, e.g.:
 *
 *   switch (strategyKey) {
 *     case "weekend":
 *       return buildWeekendTradeKit(useWeekendVol("BTC"));
 *     case "horizon":
 *       return useHorizonTradeKitDomain();
 *     default:
 *       return EMPTY_TRADE_KIT;
 *   }
 */
export function useStrategyTradeKit(_strategyKey: StrategyKey): TradeKitState {
  return EMPTY_TRADE_KIT;
}
