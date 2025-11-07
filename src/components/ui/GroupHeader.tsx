import { ChevronDown, ChevronUp } from "lucide-react";

export default function GroupHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[var(--surface-950)] border border-[var(--border)] hover:bg-[var(--surface-900)] shadow-[var(--shadow)]"
    >
      <div className="text-left">
        <h3 className="text-[var(--fg)] font-semibold tracking-tight flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[var(--brand-500)] to-[var(--brand-400)]" />
          {title}
        </h3>
        <p className="text-xs text-[var(--fg-muted)]">Click to {open ? "collapse" : "expand"}</p>
      </div>
      {open ? <ChevronUp className="w-5 h-5 text-[var(--fg-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--fg-muted)]" />}
    </button>
  );
}
