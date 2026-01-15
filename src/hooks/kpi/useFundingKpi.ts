import type { ReactNode } from "react";
import { useDeribitFunding } from "../domain/useDeribitFunding";

export type FundingRow = {
    id: string;
    metric: string;
    value: string;
    asOf: string;
};

export type FundingTableSpec = {
    title: string;
    rows: FundingRow[];
};

export type FundingKpiViewModel = {
    value: ReactNode;
    meta?: string;
    extraBadge?: string | null;
    guidanceValue?: number | null; // |z| -> matches bands.base.ts thresholds (1 / 2 σ)
    table?: FundingTableSpec;
};

export type UseFundingKpiOptions = {
    instrument?: string;
    locale?: string;
};

const PERIODS_PER_YEAR_8H = 3 * 365;

function fmtPct8h(x?: number) {
    if (x == null || !Number.isFinite(x)) return "—";
    return `${(x * 100).toFixed(3)}%`;
}
function fmtPctAnnFrom8h(x?: number) {
    if (x == null || !Number.isFinite(x)) return "—";
    const annPct = x * PERIODS_PER_YEAR_8H * 100;
    return `${annPct.toFixed(1)}%`;
}
function fmtZ(z?: number) {
    if (z == null || !Number.isFinite(z)) return "—";
    const s = z >= 0 ? "+" : "";
    return `${s}${z.toFixed(1)}`;
}

function crowdingText(z?: number | null) {
    if (z == null || !Number.isFinite(z)) return "—";
    const a = Math.abs(z);

    const side = z > 0 ? "upside crowding" : z < 0 ? "downside crowding" : "balanced";
    if (a >= 2) return `extreme · ${side}`;
    if (a >= 1) return `elevated · ${side}`;
    return `normal · ${side}`;
}

function signText(z?: number | null) {
    if (z == null || !Number.isFinite(z)) return "—";
    if (z > 0) return "+ (longs paying / upside crowding)";
    if (z < 0) return "− (shorts paying / downside crowding)";
    return "0 (balanced)";
}


export function useFundingKpi(opts: UseFundingKpiOptions = {}): FundingKpiViewModel {
    const instrument = opts.instrument ?? "BTC-PERPETUAL";
    const locale = opts.locale;

    const { loading, error, current8h, avg7d8h, zScore, updatedAt } = useDeribitFunding(instrument);

    const asOf = updatedAt
        ? new Date(updatedAt).toLocaleDateString(locale)
        : "";

    let value: ReactNode = "—";
    let meta: string | undefined;
    let extraBadge: string | null = null;

    if (loading && current8h == null) {
        value = "…";
        meta = "loading";
    } else if (error && current8h == null) {
        value = "—";
        meta = "error";
    } else if (typeof current8h === "number") {
        // Main display = annualized (matches KPI info “Funding Rate (ann.)” in kpis.ts)
        value = fmtPctAnnFrom8h(current8h);
        meta = updatedAt
            ? `Deribit · ${new Date(updatedAt).toLocaleTimeString(locale)}`
            : "Deribit";

        // Keep badge short, details go into mini-table
        if (typeof zScore === "number") extraBadge = `z ${fmtZ(zScore)}`;
    } else {
        value = "—";
        meta = "Awaiting data";
    }

    const rows: FundingRow[] = [
        { id: "fund_8h", metric: "Funding (8h)", value: fmtPct8h(current8h), asOf },
        { id: "fund_ann", metric: "Funding (ann.)", value: fmtPctAnnFrom8h(current8h), asOf },
        { id: "avg7_ann", metric: "7d avg (ann.)", value: fmtPctAnnFrom8h(avg7d8h), asOf },
        { id: "z", metric: "Z-score (7d)", value: fmtZ(zScore), asOf },
        { id: "z_dir", metric: "Direction", value: signText(zScore), asOf },
        { id: "pressure", metric: "Pressure", value: crowdingText(zScore), asOf },
    ].filter(r => r.value !== "—" || r.id === "fund_ann" || r.id === "fund_8h");

    const guidanceValue =
        typeof zScore === "number" && Number.isFinite(zScore) ? Math.abs(zScore) : null;

    return {
        value,
        meta,
        extraBadge,
        guidanceValue,
        table: { title: "Funding details", rows },
    };
}
