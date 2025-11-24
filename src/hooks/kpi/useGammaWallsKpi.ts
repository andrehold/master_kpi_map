// src/hooks/useGammaWallsKpi.ts
import type { ReactNode } from "react";
import type { useGammaWalls } from "../domain/useGammaWalls";

/**
 * Reuse the existing domain hook's state shape, but we don't call it here.
 * We just use its return type.
 */
type GammaWallsState = ReturnType<typeof useGammaWalls>;

export type GammaWallsRow = {
  id: string;
  strike: string; // formatted, e.g. "45k"
  size: string;   // formatted USD, e.g. "$12.3M"
};

export type GammaWallsKpiStatus =
  | "unavailable"
  | "loading"
  | "error"
  | "empty"
  | "ok";

export type GammaWallsKpiViewModel = {
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  guidanceValue?: number | null;

  status: GammaWallsKpiStatus;
  message?: string;      // for unavailable / loading / empty
  errorMessage?: string; // for error
  rows?: GammaWallsRow[]; // for ok state
};

/**
 * View-model "hook" that takes the existing gammaWalls state and turns it into
 * something KpiCardRenderer can consume directly.
 *
 * NOTE: This is *not* a React hook in the sense of using useState/useEffect.
 * It’s a pure function that you can safely call inside a conditional.
 */
export function useGammaWallsKpi(
  gw: GammaWallsState | undefined | null
): GammaWallsKpiViewModel {
  let value: ReactNode = "—";
  let meta: string | undefined;
  let extraBadge: string | null = null;
  let status: GammaWallsKpiStatus = "empty";
  let message: string | undefined;
  let errorMessage: string | undefined;
  let rows: GammaWallsRow[] | undefined;

  if (!gw) {
    status = "unavailable";
    value = "—";
    meta = "Gamma walls unavailable";
    message = "Gamma walls unavailable";
  } else if (gw.loading) {
    status = "loading";
    value = "…";
    meta = "loading";
    message = "Loading gamma walls…";
  } else if (gw.error) {
    status = "error";
    value = "—";
    meta = "error";
    errorMessage = String(gw.error);
  } else if (gw.top && gw.top.length > 0) {
    status = "ok";

    const top = gw.top[0] as any;

    // Main KPI value: "<strike> • <|GEX| in USD>"
    value = `${fmtK(top.strike)} • ${fmtUsdShort(top.gex_abs_usd)}`;

    // Meta: "Near S <spot>" or fallback
    meta = gw.indexPrice
      ? `Near S ${Math.round(gw.indexPrice)}`
      : "Net |GEX| near spot";

    // Extra badge: other strikes
    const others = (gw.top as any[])
      .slice(1)
      .map((t: any) => fmtK(t.strike))
      .join(" • ");
    extraBadge = others ? `Also: ${others}` : null;

    // Top-5 rows for the mini table
    const topWalls = (gw.top as any[]).slice(0, 5);
    rows = topWalls.map((wall: any, idx: number) => ({
      id: `wall-${wall.strike}-${idx}`,
      strike: fmtK(wall.strike),
      size: fmtUsdShort(wall.gex_abs_usd),
    }));
  } else {
    status = "empty";
    value = "—";
    meta = "Awaiting data";
    message = "No gamma walls in scope";
  }

  return {
    value,
    meta,
    extraBadge,
    guidanceValue: null, // no bands for gamma walls (for now)
    status,
    message,
    errorMessage,
    rows,
  };
}

/**
 * Local helpers – these mirror the versions you already have in KpiCardRenderer.
 * If you later centralize them into a shared util, you can import instead.
 */
function fmtK(x: number) {
  return x >= 1000 ? `${Math.round(x / 1000)}k` : `${Math.round(x)}`;
}

function fmtUsdShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}
