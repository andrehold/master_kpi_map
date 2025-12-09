// src/hooks/kpi/useAtmIvKpi.ts
import { useMemo } from "react";
import type { IVPoint } from "../../lib/atmIv";
import type { IVTermStructureData } from "../domain/useIVTermStructure";
import { getKpiParamsFor } from "../../config/kpiConfig";
import { KPI_IDS } from "../../kpi/kpiIds";

type FooterRow = {
  id: string;
  tenor: string;
  iv: string;
  expiry: string;
  // internal helper fields (not rendered directly)
  tenorDays?: number;
  isDvol?: boolean;
};

type Footer = {
  title: string;
  rows: FooterRow[];
};

export interface AtmIvKpiViewModel {
  value: string | null;
  meta?: string;
  footer?: Footer;
}

/**
 * ATM IV KPI view-model
 * - Uses configured primaryTenor and extraTenors
 * - Reads ATM IV curve points from IV term-structure data (already fetched)
 * - Always includes DVOL 30D as an additional row in the mini table when available
 * - If no ATM IV data is available at all, falls back to DVOL as the main value
 */
export function useAtmIvKpi(
  termData: IVTermStructureData | null | undefined,
  dvolPct: number | null | undefined,
  locale: string
): AtmIvKpiViewModel | null {
  const params = getKpiParamsFor(KPI_IDS.atmIv);
  const primaryTenor = (params.primaryTenor as number | undefined) ?? 21;
  const extraTenors =
    (params.extraTenors as number[] | undefined) ?? [7, 30, 60];

  return useMemo(() => {
    const points = termData?.points ?? [];

    // 1) No ATM IV points yet → pure DVOL fallback
    if (!points.length) {
      if (dvolPct != null) {
        return {
          value: `${dvolPct.toFixed(1)}%`,
          meta: "DVOL 30D (proxy)",
          footer: undefined,
        };
      }
      return {
        value: null,
        meta: "Awaiting ATM IV data",
        footer: undefined,
      };
    }

    // 2) Build ATM IV rows for configured tenors
    const tenorSet: number[] = [];
    for (const t of [primaryTenor, ...extraTenors]) {
      if (Number.isFinite(t) && !tenorSet.includes(t)) tenorSet.push(t);
    }

    const atmRows: FooterRow[] = tenorSet.map((tenor) => {
      const nearest = findNearestIvPoint(points, tenor);
      const ivPct =
        nearest && typeof nearest.iv === "number"
          ? nearest.iv * 100
          : null;
      const ivText =
        ivPct != null && isFinite(ivPct) ? `${ivPct.toFixed(1)}%` : "—";

      const expiryDate = nearest
        ? nearest.expiryISO
          ? new Date(nearest.expiryISO)
          : new Date(nearest.expiryTs)
        : null;

      const expiryText =
        expiryDate && !isNaN(expiryDate.getTime())
          ? expiryDate.toLocaleDateString(locale, {
              year: "2-digit",
              month: "short",
              day: "2-digit",
            })
          : "—";

      return {
        id: `${tenor}-${nearest?.expiryTs ?? "na"}`,
        tenor: `${tenor}D`,
        iv: ivText,
        expiry: expiryText,
        tenorDays: tenor,
        isDvol: false,
      };
    });

    // 3) Decide primary value: first try configured primary tenor,
    //    then any ATM row (but never the DVOL row we'll add later).
    const primaryRow =
      atmRows.find((r) => r.tenorDays === primaryTenor) ??
      atmRows[0] ??
      null;

    // 4) Build final rows = ATM rows + DVOL row (if available)
    const rows: FooterRow[] = [...atmRows];

    if (dvolPct != null) {
      rows.push({
        id: "dvol-30d",
        tenor: "DVOL 30D",
        iv: `${dvolPct.toFixed(1)}%`,
        expiry: "—",
        isDvol: true,
      });
    }

    const footer: Footer | undefined = rows.length
      ? { title: "ATM IV by tenor", rows }
      : undefined;

    return {
      value: primaryRow ? primaryRow.iv : null,
      meta: primaryRow ? `ATM IV ${primaryRow.tenor}` : "ATM IV",
      footer,
    };
  }, [termData, dvolPct, locale, primaryTenor, JSON.stringify(extraTenors)]);
}

/** Pick nearest IV point in dteDays space */
function findNearestIvPoint(points: IVPoint[], targetDays: number) {
  if (!points?.length) return null;
  let best = points[0];
  let bestDiff = Math.abs(best.dteDays - targetDays);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const diff = Math.abs(p.dteDays - targetDays);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}
