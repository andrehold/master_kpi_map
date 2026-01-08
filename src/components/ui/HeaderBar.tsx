import { RefreshCw, Download, Sun, Moon, Cloud, Settings, Database } from "lucide-react";
import type { ThemeKey } from "../../theme/tokens";

export default function HeaderBar({
  theme,
  setTheme,
  visibleKpis,
  totalKpis,
  groupsCount,
  indexPrice,
  indexTs,
  errorText,
  onRegenerate,
  onRefreshLive,
  onExportJSON,
  loadingAny,
  onOpenConfig,
  onOpenDb,
}: {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  visibleKpis: number;
  totalKpis: number;
  groupsCount: number;
  indexPrice?: number | null;
  indexTs?: number | null;
  errorText?: string | null;
  onRegenerate: () => void;
  onRefreshLive: () => void;
  onExportJSON: () => void;
  loadingAny: boolean;
  onOpenConfig: () => void;
  onOpenDb: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-[var(--surface-950)]/95 border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-400)] text-white grid place-items-center shadow-[var(--shadow)]">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3l8 4-8 4-8-4 8-4Z" />
              <path d="M4 11l8 4 8-4" />
              <path d="M4 17l8 4 8-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">
              Master KPI Map
            </h1>
            <p className="text-xs text-[var(--fg-muted)] -mt-0.5">
              Across All Strategies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 text-xs text-[var(--fg-muted)]">
            <span className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] shadow-[var(--shadow)]">
              KPIs{" "}
              <span className="font-mono">{visibleKpis}</span>/
              <span className="font-mono">{totalKpis}</span>
            </span>
            <span className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] shadow-[var(--shadow)]">
              Groups <span className="font-mono">{groupsCount}</span>/
            </span>
            {indexPrice != null && (
              <span
                className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] shadow-[var(--shadow)]"
                title={
                  indexTs
                    ? `As of ${new Date(indexTs).toLocaleTimeString()}`
                    : undefined
                }
              >
                BTC{" "}
                <span className="font-mono">
                  {`$${Math.round(indexPrice).toLocaleString()}`}
                </span>
              </span>
            )}
            {errorText && (
              <span className="px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {errorText}
              </span>
            )}
          </div>

          <button
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)]"
          >
            <RefreshCw className="w-4 h-4" /> Samples
          </button>

          <button
            onClick={onRefreshLive}
            disabled={loadingAny}
            title="Update DVOL + IVR + RV + Funding + IV Term Structure from Deribit"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)] disabled:opacity-60"
          >
            <Cloud className={`w-4 h-4 ${loadingAny ? "animate-spin" : ""}`} />
            Update
          </button>

          <button
            onClick={onExportJSON}
            disabled={loadingAny}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)] disabled:opacity-60"
          >
            <Download className="w-4 h-4" /> JSON
          </button>

          {/* Config button */}
          <button
            onClick={onOpenConfig}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)]"
          >
            <Settings className="w-4 h-4" /> Config
          </button>

          {/* DB button */}
          <button
            onClick={onOpenDb}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)]"
          >
            <Database className="w-4 h-4" /> DB
          </button>

          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)]"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}{" "}
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
      </div>
    </header>
  );
}
