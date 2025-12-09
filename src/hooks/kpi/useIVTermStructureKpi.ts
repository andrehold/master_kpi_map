// src/hooks/kpi/useIVTermStructureKpi.ts
import { useMemo } from "react";
import { getTermStructureStats } from "../../lib/ivTerm";
import type { IVPoint } from "../../lib/atmIv";
import type { IVTermStructureData } from "../domain/useIVTermStructure";
import { getKpiParamsFor } from "../../config/kpiConfig";
import { KPI_IDS } from "../../kpi/kpiIds";

type FooterRow = {
  id: string;
  tenor: string;
  iv: string;
  expiry: string;
};

type Footer = {
  title: string;
  rows: FooterRow[];
};

export interface IVTermStructureKpiViewModel {
  value: string | null;
  meta?: string;
  extraBadge?: string | null;
  footer?: Footer;
}

/**
 * Build IV term structure KPI view model from domain data + config.
 * - Uses configured curveTenors for the mini table
 * - Recomputes stats on those projected points
 * - Uses shortTenor/longTenor only for the badge text
 */
export function useIVTermStructureKpi(
  data: IVTermStructureData | null | undefined,
  locale: string
): IVTermStructureKpiViewModel | null {
  // Read KPI-level config (global, persisted via localStorage)
  const params = getKpiParamsFor(KPI_IDS.termStructure);
  const curveTenors =
    (params.curveTenors as number[] | undefined) ?? [1, 4, 7, 21, 30, 60];
  const shortTenor = (params.shortTenor as number | undefined) ?? 4;
  const longTenor = (params.longTenor as number | undefined) ?? 30;

  return useMemo(() => {
    if (!data || !data.points || data.points.length === 0) {
      return null;
    }

    const projected = projectToCurveTenors(data.points, curveTenors);
    if (!projected.length) {
      return null;
    }

    const stats = getTermStructureStats(projected);
    const footer = buildFooter(projected, locale);

    if (
      stats.n < 2 ||
      stats.slopePerYear == null ||
      stats.termPremium == null
    ) {
      return {
        value: null,
        meta: "Awaiting data",
        extraBadge: null,
        footer,
      };
    }

    const slopeVpPerYear = stats.slopePerYear * 100; // IV is decimal (0.55 = 55%)
    const termPremiumVp = stats.termPremium * 100;

    let label: string;
    switch (stats.label) {
      case "contango":
        label = "Contango";
        break;
      case "backwardation":
        label = "Backwardation";
        break;
      case "flat":
        label = "Flat";
        break;
      default:
        label = "Insufficient";
        break;
    }

    const slopeText = `${slopeVpPerYear >= 0 ? "+" : ""}${slopeVpPerYear.toFixed(
      1
    )} vol pts / year`;
    const premiumText = `${
      termPremiumVp >= 0 ? "+" : ""
    }${termPremiumVp.toFixed(1)} pts`;

    const value = label;
    const meta = slopeText;
    const extraBadge = `${shortTenor}D → ${longTenor}D: ${premiumText}`;

    return {
      value,
      meta,
      extraBadge,
      footer,
    };
  }, [data, locale, JSON.stringify(curveTenors), shortTenor, longTenor]);
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

function buildFooter(points: IVPoint[], locale: string): Footer | undefined {
  if (!points?.length) return undefined;

  const rows: FooterRow[] = points.map((p, idx) => {
    const tenorDays = Math.round(p.dteDays);
    const tenor = tenorDays === 0 ? "0D" : `${tenorDays}D`;

    const ivText =
      typeof p.iv === "number" && isFinite(p.iv)
        ? `${(p.iv * 100).toFixed(1)}%`
        : "—";

    const expiryDate = p.expiryISO
      ? new Date(p.expiryISO)
      : new Date(p.expiryTs);

    const expiry = isNaN(expiryDate.getTime())
      ? "—"
      : expiryDate.toLocaleDateString(locale, {
          year: "2-digit",
          month: "short",
          day: "2-digit",
        });

    return {
      id: `${p.expiryTs}-${idx}`,
      tenor,
      iv: ivText,
      expiry,
    };
  });

  return {
    title: "ATM IV by tenor",
    rows,
  };
}
