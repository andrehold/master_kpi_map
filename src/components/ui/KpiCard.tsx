import Badge from "./Badge";
import KpiInfo from "../KpiInfo";
import type { KPIDef } from "../../data/kpis";

export default function KpiCard({
  kpi,
  value,
  meta,
  extraBadge,
  footer,
}: {
  kpi: KPIDef;
  value: string;
  meta?: string;
  extraBadge?: string | null;
  footer?: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-950)] p-4 shadow-[var(--shadow)] hover:border-[var(--brand-500)]/30 transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[var(--fg)] font-medium leading-snug">
            {kpi.name}
            <KpiInfo id={kpi.id} description={kpi.description} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums font-mono text-[var(--fg)]">{value}</div>
          <div className="mt-1 flex items-center gap-1 justify-end">
            {extraBadge ? <Badge>{extraBadge}</Badge> : null}
            {meta ? (
              <div className="text-[10px] text-[var(--fg-muted)] flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--fg-muted)]" />
                {meta}
              </div>
            ) : null}
          </div>
        </div>
      </div>
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
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
