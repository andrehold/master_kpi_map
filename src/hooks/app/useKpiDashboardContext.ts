import { useCallback, useMemo, useState } from "react";
import type { KpiCardRendererContext } from "../../components/ui/KpiCardRenderer";
import type { Samples } from "../../utils/samples";

import { useDeribitDvol } from "../domain/useDeribitDvol";
import { useIvrFromDvol } from "../domain/useIvrFromDvol";
import { useIVTermStructure } from "../domain/useIVTermStructure";
import { useDeribitSkew25D } from "../domain/useDeribitSkew25D";
import { useTermStructureKink } from "../domain/useTermStructureKink";
import { useRealizedVol } from "../domain/useRealizedVol";
import { useRvEmFactor } from "../domain/useRvEmFactor";
import { useDeribitIndexPrice } from "../domain/useDeribitIndexPrice";
import { useDeribitFunding } from "../domain/useDeribitFunding";
import { useDeribitBasis } from "../domain/useDeribitBasis";
import { useCondorCreditPctOfEM } from "../domain/useCondorCreditPctOfEM";
import { useOpenInterestConcentration } from "../domain/useOpenInterestConcentration";
import { useExpectedMove } from "../domain/useExpectedMove";
import { useGammaWalls } from "../domain/useGammaWalls";

import type { ExpectedMovePoint } from "../domain/useExpectedMove";
import type { IVPoint } from "../../lib/atmIv";

const RVEM_TENOR_DAYS = 20;
const EXPECTED_MOVE_TENORS: number[] = [1, 7, 30, 90];

type ExpectedMoveRow = {
  days: number;
  expiryTs: number | null;
  abs: number | null;
  pct: number | null;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildExpectedMoveRows(
  emPoints?: ExpectedMovePoint[],
  ivPoints?: IVPoint[]
): ExpectedMoveRow[] {
  if (!emPoints?.length) return [];
  const points = [...(ivPoints ?? [])].sort((a, b) => a.dteDays - b.dteDays);
  return emPoints.map((row) => ({
    days: row.days,
    expiryTs: nearestExpiryTs(points, row.days),
    abs: row.abs ?? null,
    pct: row.pct ?? null,
  }));
}

function nearestExpiryTs(points: IVPoint[], days: number): number | null {
  if (!points.length) return null;
  let bestIndex = 0;
  let bestDiff = Math.abs(points[0].dteDays - days);
  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].dteDays - days);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }
  return points[bestIndex]?.expiryTs ?? null;
}

export function useKpiDashboardContext(args: {
  currency: "BTC" | "ETH";
  runId: string | null;
  samples: Samples;
  locale: string;
}) {
  const { currency, runId, samples, locale } = args;

  const [isUpdating, setIsUpdating] = useState(false);

  // Live data
  const { valuePct: dvolPct, loading: dvolLoading, error: dvolError, refresh: refreshDvol } =
    useDeribitDvol(currency);

  const { ivr, ivp, loading: ivrLoading, error: ivrError, refresh: refreshIvr } =
    useIvrFromDvol(currency);

  const { data: tsData, loading: tsLoading, error: tsError, reload: refreshTerm } =
    useIVTermStructure({ currency, maxExpiries: 6, bandPct: 0.07, minDteHours: 12 });

  const skew7 = useDeribitSkew25D({ currency, targetDays: 7 });
  const skew30 = useDeribitSkew25D({ currency, targetDays: 30 });
  const skew60 = useDeribitSkew25D({ currency, targetDays: 60 });
  const skewLoadingAny = !!(skew7.loading || skew30.loading || skew60.loading);
  const skewErrorAny = skew7.error || skew30.error || skew60.error;

  const { data: skData, loading: skLoading, error: skError, refresh: refreshSK } =
    useTermStructureKink(currency, { pollMs: 0 });

  const { value: rvemRatio, rvAnn, ivAnn, loading: rvemLoading, error: rvemError } =
    useRvEmFactor({ currency, days: RVEM_TENOR_DAYS });

  const { price: indexPrice, lastUpdated: indexTs, error: indexError } =
    useDeribitIndexPrice(currency, 15000);

  const { basisPct: basisPctPerp, basisAbs: basisAbsPerp, lastUpdated: basisTs, loading: basisLoading, error: basisError, refresh: refreshBasis } =
    useDeribitBasis(currency, `${currency}-PERPETUAL`, 15000);

  const { rv: rv20d, lastUpdated: rvTs, loading: rvLoading, error: rvError, refresh: refreshRV } =
    useRealizedVol({ currency, windowDays: 20, resolutionSec: 86400, annualizationDays: 365 });

  const { current8h, avg7d8h, updatedAt: fundingTs, loading: fundingLoading, error: fundingError, refresh: refreshFunding } =
    useDeribitFunding(`${currency}-PERPETUAL`);

  const gammaWalls = useGammaWalls({ currency, windowPct: 0.1, topN: 5, pollMs: 0 });

  const { data: condorData, loading: condorLoading, error: condorError } =
    useCondorCreditPctOfEM({ currency, pollMs: 0 });

  const oiConcentrationState = useOpenInterestConcentration({
    currency,
    topN: 3,
    expiry: "all",
    windowPct: 0.25,
    pollMs: 0,
  });

  const expectedMoveState = useExpectedMove({ currency, horizons: EXPECTED_MOVE_TENORS });
  const expectedMoveRows = useMemo(
    () => buildExpectedMoveRows(expectedMoveState.em, expectedMoveState.points),
    [expectedMoveState.em, expectedMoveState.points]
  );

  const refreshLive = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      try { await refreshDvol(); } catch {}
      await sleep(120);
      try { await refreshIvr(); } catch {}
      await sleep(120);
      try { await refreshRV(); } catch {}
      await sleep(120);
      try { await refreshFunding(); } catch {}
      try { await refreshBasis(); } catch {}
      await sleep(150);
      try { await refreshTerm(); } catch {}
      await sleep(150);
      try { refreshSK(); } catch {}

      await sleep(150);
      skew7.refresh?.();
      await sleep(150);
      skew30.refresh?.();
      await sleep(150);
      skew60.refresh?.();
      await sleep(150);
      try { await expectedMoveState.reload(); } catch {}
    } finally {
      setIsUpdating(false);
    }
  }, [
    isUpdating,
    refreshDvol,
    refreshIvr,
    refreshRV,
    refreshFunding,
    refreshBasis,
    refreshTerm,
    refreshSK,
    skew7,
    skew30,
    skew60,
    expectedMoveState,
  ]);

  const errorText =
    dvolError ||
    ivrError ||
    tsError ||
    skewErrorAny ||
    skError ||
    rvError ||
    indexError ||
    fundingError ||
    basisError ||
    expectedMoveState.error ||
    null;

  const loadingAny =
    dvolLoading ||
    ivrLoading ||
    tsLoading ||
    skewLoadingAny ||
    skLoading ||
    rvLoading ||
    fundingLoading ||
    basisLoading ||
    expectedMoveState.loading ||
    condorLoading;

  const context: KpiCardRendererContext = useMemo(
    () => ({
      runId,
      samples,
      locale,
      dvolPct,
      ivr,
      ivp,
      rv: { value: rv20d, ts: rvTs ?? null, loading: rvLoading },
      termStructure: tsData,
      skew: {
        entries: [
          { key: "7d", label: `${currency} 7D`, state: skew7 },
          { key: "30d", label: `${currency} 30D`, state: skew30 },
          { key: "60d", label: `${currency} 60D`, state: skew60 },
        ],
        kink: { loading: skLoading, error: skError ?? null, data: skData },
      },
      rvem: {
        ratio: rvemRatio ?? null,
        rvAnn,
        ivAnn,
        loading: rvemLoading,
        error: rvemError ?? null,
        tenorDays: RVEM_TENOR_DAYS,
      },
      funding: { loading: fundingLoading, error: fundingError ?? null, current8h, avg7d8h, ts: fundingTs ?? null },
      expectedMove: { loading: expectedMoveState.loading, error: expectedMoveState.error ?? null, asOf: expectedMoveState.asOf, rows: expectedMoveRows },
      condor: { data: condorData, loading: condorLoading, error: condorError ?? null },
      basis: { loading: basisLoading, error: basisError ?? null, pct: basisPctPerp, abs: basisAbsPerp ?? null, ts: basisTs ?? null },
      oiConcentration: oiConcentrationState,
      gammaWalls,
    }),
    [
      runId,
      samples,
      locale,
      dvolPct,
      ivr,
      ivp,
      rv20d,
      rvTs,
      rvLoading,
      tsData,
      currency,
      skew7,
      skew30,
      skew60,
      skLoading,
      skError,
      skData,
      rvemRatio,
      rvAnn,
      ivAnn,
      rvemLoading,
      rvemError,
      fundingLoading,
      fundingError,
      current8h,
      avg7d8h,
      fundingTs,
      expectedMoveState.loading,
      expectedMoveState.error,
      expectedMoveState.asOf,
      expectedMoveRows,
      condorData,
      condorLoading,
      condorError,
      basisLoading,
      basisError,
      basisPctPerp,
      basisAbsPerp,
      basisTs,
      oiConcentrationState,
      gammaWalls,
    ]
  );

  return { context, indexPrice, indexTs, errorText, loadingAny, refreshLive, isUpdating };
}
