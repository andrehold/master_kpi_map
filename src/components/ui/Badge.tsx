import React from "react";

export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-900)] text-[10px] text-[var(--fg-muted)]">
      {children}
    </span>
  );
}
