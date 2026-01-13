import type { ReactNode } from "react";
import { atrWilderLast, windowBarsFromDays, type OhlcCandle } from "../../lib/ohlc";
import { usePerpHistory } from "../domain/usePerpHistory";
import { useExpectedMove } from "../domain/useExpectedMove";

export type AtrEmRow = {
    id: string;
    metric: string;
    value: string;
    asOf: string;
};

export type AtrEmTableSpec = {
    title: string;
    rows: AtrEmRow[];
};

export type AtrEmKpiViewModel = {
    value: ReactNode;
    meta?: string;
    extraBadge?: string | null;
    guidanceValue?: number | null; // ratio for bands
    table?: AtrEmTableSpec;
};

export interface UseShortHorizonAtrEmKpiOptions {
    currency?: "BTC" | "ETH";
    /** ATR window in DAYS (short horizon). Default 5. */
    atrDays?: number;
    /** Expected move horizon in DAYS. Default 5. */
    horizonDays?: number;
    /** Bar resolution. Default daily. */
    resolutionSec?: number;
}

function fmt0(v?: number): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return v.toFixed(0);
}
function fmt2(v?: number): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return v.toFixed(2);
}
function pct1(v?: number): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${(v * 100).toFixed(1)}%`;
}

function asDate(ts?: number) {
    return ts ? new Date(ts).toLocaleDateString() : "";
}

function normalizeIvDec(iv?: number): number | undefined {
    if (iv == null || !Number.isFinite(iv)) return undefined;
    // tolerate pct inputs (45.8) or decimals (0.458)
    if (iv > 2) return iv / 100;
    return iv;
}

function metaForRatio(r?: number): string | undefined {
    if (r == null || !Number.isFinite(r)) return undefined;
    if (r <= 0.7) return "Implied > realized (premium relatively rich)";
    if (r <= 1.0) return "Realized ≈ implied (balanced)";
    return "Realized ≥ implied (move risk elevated)";
}

/**
 * Short-horizon ATR / Expected Move
 * - ATR computed from PERP OHLC (Wilder)
 * - EM comes from your existing useExpectedMove domain hook
 */
export function useShortHorizonAtrEmKpi(
    opts: UseShortHorizonAtrEmKpiOptions = {}
): AtrEmKpiViewModel {
    const {
        currency = "BTC",
        atrDays = 5,
        horizonDays = 5,
        resolutionSec = 86400,
    } = opts;

    // Domain hooks (no new domain hook needed)
    const ph = usePerpHistory as any;
    const emh = useExpectedMove as any;

    const perp = ph({ currency, limit: 500, resolutionSec }) as any;
    const em = emh({ currency, horizonDays }) as any;

    // ---- Adaptation layer (keeps the rest stable even if your hook field names differ)
    const candles: OhlcCandle[] | undefined =
        (perp?.candles ?? perp?.history ?? perp?.data ?? perp?.series) as any;

    const spot: number | undefined =
        (em?.spot ?? em?.indexPrice ?? em?.price) as any;

    const atmIvDec: number | undefined = normalizeIvDec(
        (em?.atmIv ?? em?.ivAtm ?? em?.atmIV ?? em?.atmMarkIv) as any
    );

    // Prefer an already-computed expected move from domain hook, otherwise derive it from spot+iv
    const expectedMove: number | undefined =
        (em?.expectedMoveUsd ?? em?.expectedMoveAbs ?? em?.expectedMove ?? em?.emUsd) ??
        (spot != null && atmIvDec != null
            ? spot * atmIvDec * Math.sqrt(horizonDays / 365)
            : undefined);

    const loading = Boolean(perp?.loading || em?.loading);
    const error: string | undefined = (perp?.error ?? em?.error) as any;

    const lastUpdated: number | undefined = (() => {
        const a = (perp?.lastUpdated ?? perp?.ts) as number | undefined;
        const b = (em?.lastUpdated ?? em?.ts) as number | undefined;
        if (!a && !b) return undefined;
        return Math.max(a ?? 0, b ?? 0);
    })();

    // ATR
    const periodBars = windowBarsFromDays(atrDays, resolutionSec);
    const atr: number | undefined = candles ? atrWilderLast(candles, periodBars) : undefined;

    // Ratio
    const ratio =
        atr != null && expectedMove != null && expectedMove > 0
            ? atr / expectedMove
            : undefined;

    // Value/meta/badge (same loading/error pattern as ADX KPI)
    let value: ReactNode = ratio == null ? "—" : `${fmt2(ratio)}×`;
    let meta: string | undefined;
    let extraBadge: string | null = `${horizonDays}d`;

    if (loading && ratio == null) {
        value = "…";
        meta = "loading";
    } else if (error && ratio == null) {
        value = "—";
        meta = "error";
    } else if (typeof ratio === "number") {
        value = `${fmt2(ratio)}×`;
        meta = metaForRatio(ratio);
    }

    if (loading && typeof ratio === "number") extraBadge = "Refreshing…";

    // If we aren't loading/error but ratio is missing, surface what’s missing.
    // This prevents the card from looking "empty".
    if (!loading && !error && ratio == null) {
        meta =
            (candles ? "" : "no candles; ") +
            (spot == null ? "no spot; " : "") +
            (atmIvDec == null ? "no ATM IV; " : "") +
            (expectedMove == null ? "no EM; " : "") +
            (atr == null ? "no ATR; " : "");
    }


    const asOf = asDate(lastUpdated);

    const rows: AtrEmRow[] = [
        { id: "spot", metric: "Spot", value: fmt0(spot), asOf },
        { id: "atmIv", metric: "ATM IV", value: pct1(atmIvDec), asOf },
        { id: "atr", metric: `ATR (${atrDays}D)`, value: fmt0(atr), asOf },
        { id: "em", metric: `${horizonDays}D Expected Move`, value: fmt0(expectedMove), asOf },
        { id: "ratio", metric: "ATR / EM", value: ratio == null ? "—" : `${fmt2(ratio)}×`, asOf },
    ];

    return {
        value,
        meta,
        extraBadge,
        guidanceValue: typeof ratio === "number" ? ratio : null,
        table: {
            title: "Short-horizon realized vs implied",
            rows,
        },
    };
}
