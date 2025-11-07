import type { Strategy } from "../../data/kpis";

export default function StrategyTag({
  label,
  active = false,
  onClick,
}: {
  label: Strategy;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        `px-2.5 py-1 rounded-full text-xs font-medium border transition ` +
        (active
          ? "bg-[var(--brand-400)]/10 text-[var(--brand-600)] border-[var(--brand-500)]/30"
          : "bg-[var(--surface-900)] text-[var(--fg-muted)] border-[var(--border)] hover:border-[var(--brand-500)]/30 hover:text-[var(--fg)]")
      }
    >
      {label}
    </button>
  );
}
