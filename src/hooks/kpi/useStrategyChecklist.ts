// src/hooks/useStrategyChecklist.ts
import { useMemo } from "react";
import type { StrategyKey } from "../../data/kpis";
import { STRATEGY_CATALOG, KPIS, type KpiMeta } from "../../data/kpis";
import type { KpiId } from "../../kpi/kpiIds";
import {
    STRATEGY_CHECKLISTS,
    type StrategyChecklistConfig,
    type StrategyRuleConfig,
    type ChecklistTone,
} from "../../data/strategyChecklists";
import {
    computeAndFormatTradeMetric,
} from "../../strategies/tradeMetrics";

/**
 * Shape of a single KPI value passed into the checklist.
 * You can adapt this easily from your existing KPI view model.
 */
export type GlobalKpiValueForChecklist = {
    value: number | null;
    formatted: string; // e.g. "56.4 %" or "0.52"
    tone?: ChecklistTone; // derived from your band system
};

export type GlobalKpiMapForChecklist = Partial<Record<KpiId, GlobalKpiValueForChecklist>>;

/**
 * State for a single leg of the trade kit, as computed by your
 * existing strategy hooks (Horizon overlay, Weekend Vol, etc.).
 */
export type TradeKitLegState = {
    id: string;
    label?: string;
    side?: "long" | "short";
    optionType?: "call" | "put";
    strike?: number | null;
    expiry?: string | null;
    quantity?: number | null;
    mid?: number | null;
    delta?: number | null;
    gamma?: number | null;
    vega?: number | null;
    theta?: number | null;
};

/**
 * Summary metrics for the trade kit.
 * Keys should match StrategyTradeKitConfig.summaryMetricIds.
 */
export type TradeKitSummaryState = {
    [metricId: string]: number | null | undefined;
    totalCredit?: number | null;
    totalDebit?: number | null;
    maxProfit?: number | null;
    maxLoss?: number | null;
    rr?: number | null;
};

export type TradeKitState = {
    legs: TradeKitLegState[];
    summary: TradeKitSummaryState;
    loading?: boolean;
    error?: string | null;
};

/**
 * Options you pass into useStrategyChecklist.
 * This keeps the hook decoupled from your internal KPI store.
 */
export interface UseStrategyChecklistOptions {
    globalKpis: GlobalKpiMapForChecklist;
    tradeKit: TradeKitState;
}

export type RuleOutcome = "pass" | "fail" | "warn" | "unknown";

export type ChecklistOverallStatus = "go" | "review" | "no-go" | "unknown";

export type ChecklistGlobalRow = {
    kpiId: KpiId;
    label: string;
    value: number | null;
    formatted: string;
    tone?: ChecklistTone;
};

export type ChecklistTradeMetricRow = {
    id: string;
    label: string;
    value: number | null;
    formatted: string;
};

export type ChecklistRuleResult = {
    rule: StrategyRuleConfig;
    outcome: RuleOutcome;
    currentText: string;
};

export type StrategyChecklistViewModel = {
    strategyKey: StrategyKey;
    strategyName: string;
    strategyShort?: string;
    description?: string[];
    overallStatus: ChecklistOverallStatus;
    loading: boolean;
    error?: string | null;
    global: {
        rows: ChecklistGlobalRow[];
    };
    tradeKit: {
        legs: TradeKitLegState[];
        summaryMetrics: ChecklistTradeMetricRow[];
    };
    rules: ChecklistRuleResult[];
};

/**
 * Local helper: map KPI id -> KpiMeta for labels.
 */
const KPI_META_BY_ID: Record<KpiId, KpiMeta> = KPIS.reduce(
    (acc, meta) => {
        acc[meta.id] = meta;
        return acc;
    },
    {} as Record<KpiId, KpiMeta>
);

function toneToOutcome(tone: ChecklistTone | undefined): RuleOutcome {
    switch (tone) {
        case "good":
        case "neutral":
            return "pass";
        case "caution":
            return "warn";
        case "avoid":
            return "fail";
        default:
            return "unknown";
    }
}

type StrategyContext = {
    strategyKey: StrategyKey;
    config: StrategyChecklistConfig;
    globalKpis: GlobalKpiMapForChecklist;
    tradeKit: TradeKitState;
};

function evaluateRule(rule: StrategyRuleConfig, ctx: StrategyContext): ChecklistRuleResult {
    let outcome: RuleOutcome = "unknown";
    let currentText = "n/a";

    if (rule.kpiId) {
        const snap = ctx.globalKpis[rule.kpiId];
        if (!snap) {
            outcome = "unknown";
            currentText = "n/a";
        } else {
            outcome = toneToOutcome(snap.tone);
            currentText = snap.formatted ?? "n/a";
        }
    } else {
        // Fallback: if you later add rules that depend on tradeKit or multiple KPIs,
        // you can switch on rule.id + ctx.strategyKey here.
        switch (rule.id) {
            default:
                outcome = "unknown";
                currentText = "n/a";
        }
    }

    return {
        rule,
        outcome,
        currentText,
    };
}

function deriveOverallStatus(results: ChecklistRuleResult[]): ChecklistOverallStatus {
    if (!results.length) return "unknown";

    const hasHardFail = results.some(
        (r) => r.outcome === "fail" && r.rule.severity === "hard"
    );
    if (hasHardFail) return "no-go";

    const hasWarnOrSoftFail = results.some(
        (r) =>
            r.outcome === "warn" ||
            (r.outcome === "fail" && r.rule.severity === "soft")
    );
    if (hasWarnOrSoftFail) return "review";

    const hasPass = results.some((r) => r.outcome === "pass");
    if (hasPass) return "go";

    return "unknown";
}

/**
 * Main hook:
 * - consumes StrategyKey, KPI map, and trade kit state
 * - returns a view model that your UI can render into three sections.
 */
export function useStrategyChecklist(
    strategyKey: StrategyKey,
    options: UseStrategyChecklistOptions
): StrategyChecklistViewModel {
    const strategyMeta = STRATEGY_CATALOG[strategyKey];
    const checklistConfig = STRATEGY_CHECKLISTS[strategyKey];

    const { globalKpis, tradeKit } = options;

    return useMemo<StrategyChecklistViewModel>(() => {
        // 1) Global KPI rows
        const globalRows: ChecklistGlobalRow[] = checklistConfig.globalKpis.map(
            (kpiId) => {
                const meta = KPI_META_BY_ID[kpiId];
                const snap = globalKpis[kpiId];
                return {
                    kpiId,
                    label: meta?.title ?? String(kpiId),
                    value: snap?.value ?? null,
                    formatted: snap?.formatted ?? "n/a",
                    tone: snap?.tone,
                };
            }
        );

        // 2) Trade-kit summary metrics
        const summaryMetrics: ChecklistTradeMetricRow[] =
            checklistConfig.tradeKit.summaryMetricIds.map((metricId) => {
                const { value, formatted, label } = computeAndFormatTradeMetric(
                    metricId,
                    tradeKit.summary ?? {}
                );

                return {
                    id: metricId,
                    label,
                    value,
                    formatted,
                };
            });

        // 3) Rules
        const ctx: StrategyContext = {
            strategyKey,
            config: checklistConfig,
            globalKpis,
            tradeKit,
        };

        const ruleResults: ChecklistRuleResult[] = checklistConfig.rules.map(
            (rule) => evaluateRule(rule, ctx)
        );

        const overallStatus = deriveOverallStatus(ruleResults);

        return {
            strategyKey,
            strategyName: strategyMeta.name,
            strategyShort: strategyMeta.short,
            description: strategyMeta.description,
            overallStatus,
            loading: Boolean(tradeKit.loading),
            error: tradeKit.error ?? undefined,
            global: {
                rows: globalRows,
            },
            tradeKit: {
                legs: tradeKit.legs ?? [],
                summaryMetrics,
            },
            rules: ruleResults,
        };
    }, [strategyKey, strategyMeta, checklistConfig, globalKpis, tradeKit]);
}
