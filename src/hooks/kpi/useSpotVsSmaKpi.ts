import { useEffect, useState } from "react";
import { fetchPerpHistory, type Currency } from "../../services/deribit";

export type SpotVsSmaStatus = "loading" | "ready" | "error";

export type SpotVsSmaRow = {
  id: string;
  tenor: number;
  text: string;
};

export type SpotVsSmaKpiViewModel = {
  status: SpotVsSmaStatus;
  value: string | null;
  meta?: string;
  extraBadge?: string | null;
  errorMessage?: string | null;
  rows: SpotVsSmaRow[];
};

/**
 * Computes distance of spot (perpetual close) vs 20/50/100/200D SMAs.
 * Uses Deribit TradingView chart data via fetchPerpHistory.
 */
export function useSpotVsSmaKpi(
  currency: Currency = "BTC",
): SpotVsSmaKpiViewModel {
  const [state, setState] = useState<SpotVsSmaKpiViewModel>({
    status: "loading",
    value: null,
    rows: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState((s) => ({ ...s, status: "loading", errorMessage: null }));

      try {
        // ~1y of daily data – enough for 200D SMA
        const candles = await fetchPerpHistory(currency, 260, 86400);
        if (!candles.length) throw new Error("No price history");

        const closes = candles.map((c) => c.close);
        const spot = closes[closes.length - 1];

        const tenors = [20, 50, 100, 200];

        function sma(endIdx: number, window: number): number | null {
          if (endIdx - window + 1 < 0) return null;
          let sum = 0;
          for (let i = endIdx - window + 1; i <= endIdx; i += 1) {
            sum += closes[i];
          }
          return sum / window;
        }

        type InternalRow = {
          tenor: number;
          sma: number | null;
          distancePct: number | null;
          slope: "up" | "down" | "flat" | null;
        };

        const internalRows: InternalRow[] = tenors.map((tenor) => {
          const idxLast = closes.length - 1;
          const smaNow = sma(idxLast, tenor);
          const smaPrev = sma(idxLast - 1, tenor);

          let slope: "up" | "down" | "flat" | null = null;
          if (smaNow != null && smaPrev != null) {
            const diff = smaNow - smaPrev;
            const eps = Math.abs(smaNow) * 0.0005; // ~0.05% tolerance
            if (diff > eps) slope = "up";
            else if (diff < -eps) slope = "down";
            else slope = "flat";
          }

          const distancePct =
            smaNow != null && smaNow !== 0
              ? ((spot - smaNow) / smaNow) * 100
              : null;

          return { tenor, sma: smaNow, distancePct, slope };
        });

        const fmtPct = (v: number) =>
          `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

        // Main KPI: 20D
        const main = internalRows.find((r) => r.tenor === 20);
        let value: string | null = null;
        let meta: string | undefined;
        let extraBadge: string | null = null;

        if (main && main.distancePct != null && main.sma != null) {
          const rel = main.distancePct >= 0 ? "above" : "below";
          const pctText = fmtPct(main.distancePct);
          const smaText = main.sma.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          });

          value = `${pctText} vs 20D SMA (@ ${smaText})`;

          const slopeLabel =
            main.slope === "up"
              ? "slope up"
              : main.slope === "down"
              ? "slope down"
              : "slope flat";

          // e.g. "above, slope up"
          meta = `${rel}, ${slopeLabel}`;
          extraBadge = "Spot vs 20/50/100/200D SMA";
        }

        // Mini table rows: "TenorD: Spot-price is +/-x% above/below SMA (@ SMA)"
        const rows: SpotVsSmaRow[] = internalRows.map((r) => {
          if (r.distancePct == null || r.sma == null) {
            return {
              id: `sma-${r.tenor}`,
              tenor: r.tenor,
              text: `${r.tenor}D: not enough history for SMA`,
            };
          }

          const rel = r.distancePct >= 0 ? "above" : "below";
          const pctText = fmtPct(r.distancePct);
          const smaText = r.sma.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          });
          const slopeLabel =
            r.slope === "up"
              ? "up"
              : r.slope === "down"
              ? "down"
              : "flat";

          return {
            id: `sma-${r.tenor}`,
            tenor: r.tenor,
            text: `${pctText} vs ${r.tenor}D (@ ${smaText}) / ${rel} / slope ${slopeLabel}`,
          };
        });

        if (cancelled) return;

        setState({
          status: "ready",
          value,
          meta,
          extraBadge,
          errorMessage: null,
          rows,
        });
      } catch (err: any) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          status: "error",
          errorMessage: err?.message ?? String(err),
          rows: s.rows ?? [],
        }));
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [currency]);

  return state;
}
