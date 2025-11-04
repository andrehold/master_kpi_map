// src/hooks/useRvEmFactor.ts
import { useMemo } from "react";
import { useRealizedVol } from "./useRealizedVol";
import { useIVTermStructure } from "./useIVTermStructure";
import { DAYS_IN_YEAR, ivAnnFromTermStructure, rvEmFactorFromAnn } from "../lib/volMath";

type Currency = "BTC" | "ETH";

export function useRvEmFactor(
  { currency = "BTC", days, annualizationDays = DAYS_IN_YEAR }:
  { currency?: Currency; days: number; annualizationDays?: number }
) {
  // Annualized RV over the trailing window matching `days`
  const { rv: rvAnn, lastUpdated: rvTs, loading: rvLoading, error: rvError, refresh: refreshRV } =
    useRealizedVol({ currency, windowDays: days, resolutionSec: 86400, annualizationDays });

  // Term structure → annualized IV interpolated to `days`
  const { data: tsData, loading: tsLoading, error: tsError, reload: refreshTS } =
    useIVTermStructure({ currency });

  const ivAnn = useMemo(
    () => ivAnnFromTermStructure(tsData as any, days, annualizationDays) ?? undefined,
    [tsData, days, annualizationDays]
  );

  const value = useMemo(
    () => rvEmFactorFromAnn(rvAnn, ivAnn),
    [rvAnn, ivAnn]
  );

  return {
    value,                  // ratio (e.g., 0.92)
    rvAnn,                  // for tooltips/debug
    ivAnn,
    lastUpdated: rvTs ?? tsData?.asOf,
    loading: rvLoading || tsLoading,
    error: rvError || tsError || (ivAnn == null ? "No IV at tenor" : undefined),
    refresh: () => { try { refreshRV?.(); } catch {} try { refreshTS?.(); } catch {} },
  };
}
