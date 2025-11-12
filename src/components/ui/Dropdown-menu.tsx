import * as React from "react";

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerEl: HTMLElement | null;
  setTriggerEl: (el: HTMLElement | null) => void;
};

const DropdownCtx = React.createContext<Ctx | null>(null);

export function DropdownMenu({
  children,
  onOpenChange,
}: {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, _setOpen] = React.useState(false);
  const [triggerEl, setTriggerEl] = React.useState<HTMLElement | null>(null);

  const setOpen = React.useCallback(
    (v: boolean) => {
      _setOpen(v);
      onOpenChange?.(v); // notify parent (so it can reset submenu state)
    },
    [onOpenChange]
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <DropdownCtx.Provider value={{ open, setOpen, triggerEl, setTriggerEl }}>
      <div className="relative inline-block">{children}</div>
    </DropdownCtx.Provider>
  );
}

type TriggerProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactElement;
  asChild?: boolean; // supported for API parity
  className?: string;
};

export const DropdownMenuTrigger = React.forwardRef<HTMLElement, TriggerProps>(
  function DropdownMenuTrigger({ children, asChild, className, ...rest }, forwardedRef) {
    const ctx = React.useContext(DropdownCtx)!;

    return React.cloneElement(children, {
      ...rest,
      ref: (el: any) => {
        ctx.setTriggerEl(el);
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef && "current" in (forwardedRef as any)) (forwardedRef as any).current = el;
        const childRef: any = (children as any).ref;
        if (typeof childRef === "function") childRef(el);
        else if (childRef && "current" in childRef) childRef.current = el;
      },
      onClick: (e: any) => {
        ctx.setOpen(!ctx.open);
        children.props.onClick?.(e);
      },
      "aria-haspopup": "menu",
      "aria-expanded": ctx.open,
      className: [children.props.className, className].filter(Boolean).join(" "),
    });
  }
);

export function DropdownMenuContent({
  children,
  className,
  align = "end",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  const ctx = React.useContext(DropdownCtx)!;
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!ctx.open) return;
      if (contentRef.current?.contains(t)) return;
      if (ctx.triggerEl?.contains(t)) return;
      ctx.setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [ctx.open, ctx.triggerEl, ctx.setOpen]);

  if (!ctx.open) return null;

  return (
    <div
      ref={contentRef}
      role="menu"
      className={
        "absolute z-50 min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--surface-950)] p-1 shadow-lg " +
        (align === "end" ? "right-0 mt-2" : "left-0 mt-2") +
        (className ? " " + className : "")
      }
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled,
  keepOpen = false, // NEW: allow items to keep the menu open
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  keepOpen?: boolean;
}) {
  const ctx = React.useContext(DropdownCtx)!;
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        if (!keepOpen) ctx.setOpen(false); // only close if not a submenu navigation
      }}
      className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-[var(--surface-900)] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-[var(--border)]" />;
}
