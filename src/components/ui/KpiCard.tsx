import Badge from "./Badge";
import KpiInfo from "../KpiInfo";
import type { KPIDef } from "../../data/kpis";

export default function KpiCard({
  kpi,
  value,
  meta,
  extraBadge,
  footer,
  onInfoClick, // NEW
}: {
  kpi: KPIDef;
  value: string;
  meta?: string;
  extraBadge?: string | null;
  footer?: React.ReactNode;
  onInfoClick?: () => void; // NEW
}) {
  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-950)] p-4 shadow-[var(--shadow)] hover:border-[var(--brand-500)]/30 transition">
      {/* Header: name | value */}
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-4">
        {/* KPI Name + Info */}
        <div className="text-[var(--fg)] font-medium leading-snug flex items-center gap-1">
          <span>{kpi.name}</span>
          <span className="relative inline-flex">
            {/* Keep your existing info icon (KpiInfo), but overlay a click-catcher that opens the drawer.
               This stops the old hover popover while preserving your icon styling. */}
            <KpiInfo id={kpi.id} description={kpi.description} />
            {onInfoClick && (
              <button
                aria-label="Open KPI info"
                title="Open KPI info"
                className="absolute inset-0 cursor-pointer"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInfoClick(); }}
                onMouseEnter={(e) => e.stopPropagation()}
                onMouseLeave={(e) => e.stopPropagation()}
              />
            )}
          </span>
        </div>

        {/* Value */}
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums font-mono text-[var(--fg)]">
            {value}
          </div>
        </div>

        {/* Full-width row below the KPI name for chip + meta */}
        {(extraBadge || meta) && (
          <div className="col-span-2 mt-1 flex w-full flex-wrap items-center gap-1">
            {extraBadge ? <Badge>{extraBadge}</Badge> : null}
            {meta ? (
              <div className="text-[10px] text-[var(--fg-muted)] flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--fg-muted)]" />
                {meta}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Strategies */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {kpi.strategies.map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded-full text-[10px] border border-[var(--border)] text-[var(--fg-muted)] bg-[var(--surface-900)]"
          >
            {s}
          </span>
        ))}
      </div>

      {/* Footer (optional) */}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
