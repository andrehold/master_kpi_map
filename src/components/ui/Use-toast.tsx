import * as React from "react";

type ToastVariant = "default" | "destructive";
type Toast = { id: number; title?: string; description?: string; variant?: ToastVariant; duration?: number };

type ToastCtx = {
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
};

const Ctx = React.createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setItems((xs) => xs.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const duration = t.duration ?? 3500;
    setItems((xs) => [...xs, { id, ...t }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ toast, dismiss }}>
      {children}
      <Toaster toasts={items} dismiss={dismiss} />
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

function Toaster({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "w-80 rounded-md border px-3 py-2 shadow " +
            (t.variant === "destructive"
              ? "bg-red-950/60 border-red-900 text-red-50"
              : "bg-[var(--surface-950)] border-[var(--border)] text-[var(--fg)]")
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {t.title && <div className="text-sm font-semibold">{t.title}</div>}
              {t.description && <div className="text-sm opacity-80">{t.description}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-xs opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
