// src/components/KpiInfo.tsx
import { Info } from "lucide-react";
import kpiStrings from "../i18n/en/kpi.json";

type Props = {
  id: string;
  /** Optional per-KPI override text */
  description?: string;
  className?: string;
};

/**
 * Info icon with tooltip that opens ONLY on the icon (hover/focus).
 * Uses Tailwind's `peer` so it doesn't react to any outer `.group` hovers.
 * Reads copy from i18n by KPI id unless `description` is provided.
 */
export default function KpiInfo({ id, description, className }: Props) {
  const text =
    description ??
    // If the key is missing in i18n, render nothing.
    (kpiStrings as any)?.kpis?.[id];

  if (!text) return null;

  return (
    <span className={`relative inline-flex items-center ${className ?? ""}`}>
      {/* Trigger */}
      <button
        type="button"
        aria-label="KPI info"
        className="peer inline-flex h-5 w-5 items-center justify-center rounded-full
                   border border-[var(--border)] text-[var(--fg-muted)]
                   hover:text-[var(--fg)] hover:border-[var(--fg-muted)]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {/* Tooltip */}
      <div
        role="tooltip"
        className="pointer-events-none absolute z-30 left-0 top-full mt-2 w-80
                   rounded-2xl border border-[var(--border)] bg-[var(--surface-950)]
                   p-4 shadow-[var(--shadow)] text-[var(--fg)] text-sm leading-5
                   invisible opacity-0 translate-y-1
                   transition duration-150 ease-out
                   peer-hover:visible peer-hover:opacity-100 peer-hover:translate-y-0
                   peer-focus-visible:visible peer-focus-visible:opacity-100 peer-focus-visible:translate-y-0"
      >
        {text}
      </div>
    </span>
  );
}
