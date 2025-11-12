import * as React from "react";

const TooltipCtx = React.createContext<{ delay: number }>({ delay: 250 });

export function TooltipProvider({
  children,
  delay = 250,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <TooltipCtx.Provider value={{ delay }}>{children}</TooltipCtx.Provider>
  );
}

export function Tooltip({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function TooltipTrigger({
  children,
  asChild = false,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  // passthrough container to keep API parity
  return <span className={asChild ? "" : "inline-block"}>{children}</span>;
}

export function TooltipContent({
  children,
  side = "bottom",
}: {
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [show, setShow] = React.useState(false);
  const { delay } = React.useContext(TooltipCtx);

  React.useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    let to: any;
    function over() {
      to = setTimeout(() => setShow(true), delay);
    }
    function out() {
      clearTimeout(to);
      setShow(false);
    }
    parent.addEventListener("mouseenter", over);
    parent.addEventListener("mouseleave", out);
    return () => {
      parent.removeEventListener("mouseenter", over);
      parent.removeEventListener("mouseleave", out);
    };
  }, [delay]);

  return (
    <div ref={ref} className="relative">
      {show && (
        <div
          className={
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface-950)] px-2 py-1 text-xs text-[var(--fg)] shadow " +
            (side === "bottom" ? "top-full mt-1" : "bottom-full mb-1")
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
