import type { ReactNode } from "react";
import type { useGammaWalls } from "../domain/useGammaWalls"; // adjust path
import { fmtK, fmtUsdShort } from "../../utils/format"; // adjust alias/path

type GammaWallsState = ReturnType<typeof useGammaWalls>;

export type GammaWallsRow = {
  id: string;
  strike: string;
  size: string;
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
  message?: string;
  errorMessage?: string;
  rows?: GammaWallsRow[];
};

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

    value = `${fmtK(top.strike)} • ${fmtUsdShort(top.gex_abs_usd)}`;

    meta = gw.indexPrice
      ? `Near S ${Math.round(gw.indexPrice)}`
      : "Net |GEX| near spot";

    const others = (gw.top as any[])
      .slice(1)
      .map((t: any) => fmtK(t.strike))
      .join(" • ");
    extraBadge = others ? `Also: ${others}` : null;

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
    guidanceValue: null,
    status,
    message,
    errorMessage,
    rows,
  };
}