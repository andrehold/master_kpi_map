// src/components/strategy/StrategyChecklistPanel.tsx
import * as React from "react";
import {
  type StrategyChecklistViewModel,
  type ChecklistRuleResult,
  type ChecklistOverallStatus,
  type RuleOutcome,
} from "../../hooks/kpi/useStrategyChecklist";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

export interface StrategyChecklistPanelProps {
  model: StrategyChecklistViewModel;
}

function overallStatusLabel(status: ChecklistOverallStatus): string {
  switch (status) {
    case "go":
      return "GO";
    case "review":
      return "REVIEW";
    case "no-go":
      return "NO-GO";
    default:
      return "Unknown";
  }
}

function overallStatusClass(status: ChecklistOverallStatus): string {
  switch (status) {
    case "go":
      return "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40";
    case "review":
      return "bg-amber-500/20 text-amber-300 border border-amber-400/40";
    case "no-go":
      return "bg-rose-600/20 text-rose-400 border border-rose-500/40";
    default:
      return "bg-slate-700/40 text-slate-300 border border-slate-600";
  }
}

function tonePillClass(tone: string | undefined): string {
  switch (tone) {
    case "good":
      return "bg-emerald-500/10 text-emerald-300";
    case "caution":
      return "bg-amber-500/10 text-amber-200";
    case "avoid":
      return "bg-rose-500/10 text-rose-300";
    case "neutral":
    default:
      return "bg-slate-600/60 text-slate-200";
  }
}

function toneLabel(tone: string | undefined): string {
  switch (tone) {
    case "good":
      return "Good";
    case "caution":
      return "Caution";
    case "avoid":
      return "Avoid";
    case "neutral":
      return "Neutral";
    default:
      return "n/a";
  }
}

function ruleOutcomeIcon(outcome: RuleOutcome) {
  switch (outcome) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "warn":
      return <AlertTriangle className="h-4 w-4 text-amber-300" />;
    case "fail":
      return <XCircle className="h-4 w-4 text-rose-400" />;
    default:
      return <HelpCircle className="h-4 w-4 text-slate-400" />;
  }
}

function ruleOutcomeLabel(outcome: RuleOutcome): string {
  switch (outcome) {
    case "pass":
      return "Pass";
    case "warn":
      return "Review";
    case "fail":
      return "Fail";
    default:
      return "Unknown";
  }
}

function ruleOutcomeClass(outcome: RuleOutcome): string {
  switch (outcome) {
    case "pass":
      return "text-emerald-300";
    case "warn":
      return "text-amber-200";
    case "fail":
      return "text-rose-300";
    default:
      return "text-slate-300";
  }
}

export const StrategyChecklistPanel: React.FC<StrategyChecklistPanelProps> = ({
  model,
}) => {
  const {
    strategyName,
    strategyShort,
    description,
    overallStatus,
    loading,
    error,
    global,
    tradeKit,
    rules,
  } = model;

  return (
    <div className="flex flex-col gap-6 text-sm">
      {/* Header */}
      <header className="flex flex-col gap-2 border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Strategy checklist
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-semibold text-[var(--fg-strong)]">
                {strategyName}
              </h2>
              {strategyShort && (
                <span className="rounded-full bg-[var(--surface-700)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  {strategyShort}
                </span>
              )}
            </div>
          </div>

          <div
            className={
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide " +
              overallStatusClass(overallStatus)
            }
          >
            {overallStatusLabel(overallStatus)}
          </div>
        </div>

        {description && description.length > 0 && (
          <p className="max-w-2xl text-xs text-[var(--fg-muted)]">
            {description[0]}
          </p>
        )}

        {loading && (
          <div className="text-xs text-[var(--fg-muted)]">
            Loading trade kit…
          </div>
        )}
        {error && (
          <div className="text-xs text-rose-300">
            Checklist error: {error}
          </div>
        )}
      </header>

      {/* 1) Global KPIs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Global KPIs
          </h3>
          <span className="text-[11px] text-[var(--fg-muted)]">
            Snapshot from main dashboard
          </span>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {global.rows.map((row) => (
            <div
              key={row.kpiId}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-800)] px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-xs text-[var(--fg-muted)]">
                  {row.label}
                </span>
                <span className="font-mono text-sm text-[var(--fg-strong)]">
                  {row.formatted}
                </span>
              </div>
              <div
                className={
                  "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                  tonePillClass(row.tone)
                }
              >
                {toneLabel(row.tone)}
              </div>
            </div>
          ))}

          {global.rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-900)] px-3 py-2 text-xs text-[var(--fg-muted)]">
              No KPI mapping configured for this strategy yet.
            </div>
          )}
        </div>
      </section>

      {/* 2) Trade kit */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Trade kit
          </h3>
          <span className="text-[11px] text-[var(--fg-muted)]">
            Legs + summary metrics
          </span>
        </div>

        {/* Summary metrics */}
        <div className="grid gap-2 md:grid-cols-2">
          {tradeKit.summaryMetrics.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-800)] px-3 py-2"
            >
              <div className="text-xs text-[var(--fg-muted)]">{m.label}</div>
              <div className="font-mono text-sm text-[var(--fg-strong)]">
                {m.formatted}
              </div>
            </div>
          ))}
          {tradeKit.summaryMetrics.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-900)] px-3 py-2 text-xs text-[var(--fg-muted)]">
              No summary metrics defined for this strategy’s trade kit yet.
            </div>
          )}
        </div>

        {/* Legs table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-900)]">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-[var(--surface-800)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Leg</th>
                <th className="px-3 py-2 text-left font-medium">Side</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">Strike</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Mid</th>
                <th className="px-3 py-2 text-right font-medium">Δ</th>
                <th className="px-3 py-2 text-right font-medium">Γ</th>
                <th className="px-3 py-2 text-right font-medium">Vega</th>
                <th className="px-3 py-2 text-right font-medium">Θ</th>
              </tr>
            </thead>
            <tbody>
              {tradeKit.legs.map((leg) => (
                <tr
                  key={leg.id}
                  className="border-t border-[var(--border)] even:bg-[var(--surface-950)]/40"
                >
                  <td className="px-3 py-2">
                    {leg.label ?? leg.id ?? "Leg"}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {leg.side ?? "—"}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {leg.optionType ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {leg.strike != null ? leg.strike.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {leg.quantity != null ? leg.quantity : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {leg.mid != null ? leg.mid.toFixed(4) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {leg.delta != null ? leg.delta.toFixed(3) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {leg.gamma != null ? leg.gamma.toFixed(4) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {leg.vega != null ? leg.vega.toFixed(4) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {leg.theta != null ? leg.theta.toFixed(4) : "—"}
                  </td>
                </tr>
              ))}
              {tradeKit.legs.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-4 text-center text-[var(--fg-muted)]"
                  >
                    No trade-kit legs wired yet. Once your strategy hook
                    populates TradeKitState.legs, they will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3) Pre-Trade Check */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Pre-Trade Check
          </h3>
          <div
            className={
              "rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide " +
              overallStatusClass(overallStatus)
            }
          >
            {overallStatusLabel(overallStatus)}
          </div>
        </div>

        <div className="space-y-2">
          {rules.map((r: ChecklistRuleResult) => (
            <div
              key={r.rule.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-900)] px-3 py-2"
            >
              <div className="flex flex-col gap-1">
                <div className="text-xs text-[var(--fg-strong)]">
                  {r.rule.label}
                </div>
                <div className="text-[11px] text-[var(--fg-muted)]">
                  Current:{" "}
                  <span className="font-mono text-[var(--fg-strong)]">
                    {r.currentText}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--muted)]">
                  Severity:{" "}
                  <span className="uppercase">
                    {r.rule.severity === "hard" ? "Hard filter" : "Soft rule"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {ruleOutcomeIcon(r.outcome)}
                <span
                  className={
                    "text-xs font-medium uppercase tracking-wide " +
                    ruleOutcomeClass(r.outcome)
                  }
                >
                  {ruleOutcomeLabel(r.outcome)}
                </span>
              </div>
            </div>
          ))}

          {rules.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-900)] px-3 py-2 text-xs text-[var(--fg-muted)]">
              No pre-trade rules defined for this strategy yet. Add rules in{" "}
              <code>strategyChecklists.ts</code> to populate this section.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
