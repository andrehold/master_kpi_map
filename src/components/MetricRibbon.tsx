import React from "react";

export type RibbonItem = {
  id: string;
  label: string;          // e.g., "2D", "1W"
  value?: string;         // formatted, e.g., "± 1,235" or "± 2.45%"
  badge?: string;         // small tag on the right, e.g., "IV 1W 47.3%"
  footnote?: string;      // tiny line under the value, e.g., "√t 0.289"
};

export type MetricRibbonProps = {
  title?: string;
  className?: string;
  items: RibbonItem[];
  loading?: boolean;
  error?: string | null;

  /** Optional header chips, e.g. ["Spot 57,210", "IV TS 14:32"] */
  headerChips?: string[];

  /** Optional right-aligned header controls (e.g., toggle, refresh button) */
  controls?: React.ReactNode;

  /** Optional bottom helper text */
  helperText?: string;
};

export default function MetricRibbon({
  title = "Metric Ribbon",
  className,
  items,
  loading,
  error,
  headerChips,
  controls,
  helperText,
}: MetricRibbonProps) {
  const anyLoading = !!loading;

  return (
    <div
      className={[
        "rounded-2xl border border-[var(--border)]",
        // Solid card background to match other KPI cards:
        "bg-[var(--surface-0)] shadow-[var(--shadow)]",
        className || "",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 text-[var(--fg-muted)]">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--surface-100)]">
            ±
          </span>
          <h3 className="text-sm tracking-wide uppercase">{title}</h3>
          {headerChips?.map((chip, i) => (
            <span
              key={i}
              className="ml-2 text-xs px-2 py-0.5 rounded-lg bg-[var(--surface-100)] border border-[var(--border)]"
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">{controls}</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-[var(--border)]">
        {items.map((it) => (
          <div key={it.id} className="p-4">
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                {it.label}
              </div>
              {it.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-100)] border border-[var(--border)]">
                  {it.badge}
                </span>
              )}
            </div>

            <div className="h-16 flex items-center">
              {anyLoading ? (
                <div className="w-24 h-6 rounded-md bg-[var(--surface-100)] animate-pulse" />
              ) : it.value ? (
                <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
              ) : (
                <div className="text-[var(--fg-muted)]">—</div>
              )}
            </div>

            {it.footnote && (
              <div className="mt-2 text-[11px] text-[var(--fg-muted)]">{it.footnote}</div>
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 text-xs text-red-500/90 border-t border-[var(--border)]">
          {String(error)}
        </div>
      )}

      {/* Footer helper */}
      {helperText && (
        <div className="px-4 py-3 text-[10px] text-[var(--fg-muted)] border-t border-[var(--border)]">
          {helperText}
        </div>
      )}
    </div>
  );
}
