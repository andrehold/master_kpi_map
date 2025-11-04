// src/components/KpiInfo.tsx
import { Info } from "lucide-react";
import kpiStrings from "../i18n/en/kpi.json";

type Props = {
  id: string;
  /** Optional per-KPI override (if you already pass kpi.description) */
  description?: string;
  className?: string;
};

/**
 * Small info icon that shows a tooltip on hover/focus.
 * Reads copy from i18n JSON by KPI id, unless an explicit description is provided.
 */
export default function KpiInfo({ id, description, className }: Props) {
  const text =
    description ??
    // if the key is missing, render nothing
    (kpiStrings as any)?.kpis?.[id];

  if (!text) return null;

  return (
    <span className={`relative inline-flex items-center group ${className ?? ""}`}>
      <button
        type="button"
        aria-label="KPI info"
        className="p-1 rounded-full hover:bg-[var(--surface-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
      >
        <Info className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
      </button>

      {/* Tooltip */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 hidden w-64 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] p-2 text-xs text-[var(--fg-muted)] shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
