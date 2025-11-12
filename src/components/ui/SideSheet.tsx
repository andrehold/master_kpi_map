import * as React from "react";
import { Button } from "./Button";

export function SideSheet({
  open,
  onOpenChange,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        className="absolute top-0 right-0 h-full bg-[var(--surface-950)] text-[var(--fg)] border-l border-[var(--border)] shadow-xl"
        style={{ width }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="font-semibold">{title}</div>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
        <div className="p-4 overflow-auto h-[calc(100%-48px)]">{children}</div>
      </div>
    </div>
  );
}
