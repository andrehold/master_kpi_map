import { useCallback, useEffect, useRef, useState } from "react";
import { getTermStructureStats, type IVTermStructureLabel } from "../../lib/ivTerm";
import { buildAtmIvPoints, type IVPoint, type AtmSelection } from "../../lib/atmIv";
import { getKpiParamsFor } from "../../config/kpiConfig";
import { KPI_IDS } from "../../kpi/kpiIds";

export type UseIVTermStructureOptions = {
  currency?: "BTC" | "ETH";
  bandPct?: number;
  minDteHours?: number;
  refreshMs?: number;

  // selection passthrough
  selection?: AtmSelection;   // "curated" | "all" (default "curated")

  // Curated mode
  maxExpiries?: number;       // default 8
  nearDays?: number;          // default 14

  // "All" mode
  minDteDays?: number;        // default 2
  maxDteDays?: number;        // default 400
  maxAllExpiries?: number;    // default 48
};

export type IVTermStructureData = {
  asOf: number;
  currency: string;
  indexPrice: number | null;
  /** ATM IV points used for stats / mini table (already filtered to configured curve tenors). */
  points: IVPoint[];
  n: number;
  slopePerYear: number | null;
  termPremium: number | null;
  label: IVTermStructureLabel;
};

export function useIVTermStructureKPI({
  currency = "BTC",
  bandPct = 0,
  minDteHours = 12,
  refreshMs = 0,

  selection = "curated",

  maxExpiries = 8,
  nearDays = 14,

  minDteDays = 2,
  maxDteDays = 400,
  maxAllExpiries = 48,
}: UseIVTermStructureOptions = {}) {
  const [data, setData] = useState<IVTermStructureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const result = await buildAtmIvPoints({
          currency,
          minDteHours,
          bandPct,
          selection,
          maxExpiries,
          nearDays,
          minDteDays,
          maxDteDays,
          maxAllExpiries,
          signal,
        });

        if (signal?.aborted) {
          return;
        }

        const { asOf, indexPrice, points: rawPoints } = result;

        // Read current KPI config for term structure
        const params = getKpiParamsFor(KPI_IDS.termStructure);
        const curveTenors =
          (params.curveTenors as number[] | undefined) ??
          [1, 4, 7, 21, 30, 60];

        // Project raw points onto configured curve tenors:
        // for each tenor, pick the nearest available expiry, dedupe by expiry.
        const points = projectToCurveTenors(rawPoints, curveTenors);

        const stats = getTermStructureStats(points);

        const next: IVTermStructureData = {
          asOf,
          currency,
          indexPrice,
          points,
          n: stats.n,
          slopePerYear: stats.slopePerYear,
          termPremium: stats.termPremium,
          label: stats.label,
        };

        setData(next);
      } catch (e: any) {
        if (signal?.aborted) return;
        // eslint-disable-next-line no-console
        console.error("useIVTermStructure error", e);
        setError(e?.message ?? "Failed to load IV term structure");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      currency,
      bandPct,
      minDteHours,
      selection,
      maxExpiries,
      nearDays,
      minDteDays,
      maxDteDays,
      maxAllExpiries,
    ],
  );

  // initial load + reload when key options change
  useEffect(() => {
    const ctl = new AbortController();
    abortRef.current = ctl;
    run(ctl.signal);

    return () => {
      ctl.abort();
      abortRef.current = null;
    };
  }, [run]);

  // optional polling
  useEffect(() => {
    if (!refreshMs || refreshMs <= 0) return;
    if (typeof window === "undefined") return;

    timer.current = window.setInterval(() => {
      const ctl = new AbortController();
      run(ctl.signal);
    }, refreshMs) as unknown as number;

    return () => {
      if (timer.current) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [refreshMs, run]);

  const reload = () => {
    const ctl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctl;
    run(ctl.signal);
  };

  return { data, loading, error, reload };
}

/**
 * For each target tenor, pick the nearest IV point by dteDays.
 * Deduplicate by expiryTs so multiple tenors can't pick the same expiry.
 * Result is sorted by dteDays ascending.
 */
function projectToCurveTenors(points: IVPoint[], curveTenors: number[]): IVPoint[] {
  if (!points?.length || !curveTenors?.length) return points ?? [];

  const sorted = [...points].sort((a, b) => a.dteDays - b.dteDays);
  const chosen: IVPoint[] = [];
  const usedExpiry = new Set<number>();

  for (const target of curveTenors) {
    let best: IVPoint | null = null;
    let bestDiff = Infinity;

    for (const p of sorted) {
      const diff = Math.abs(p.dteDays - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = p;
      }
    }

    if (best && !usedExpiry.has(best.expiryTs)) {
      usedExpiry.add(best.expiryTs);
      chosen.push(best);
    }
  }

  return chosen.sort((a, b) => a.dteDays - b.dteDays);
}