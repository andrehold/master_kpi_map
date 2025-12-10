// src/components/ui/Guidance.tsx
// Drop-in UI for KPI Guidance: mini band bar + side drawer + global toggle
// - Tolerates KPIs that have info only (no bands/signals)
// - i18n dictionaries are loaded from /src/i18n/*/bands.json via Vite import glob
// - Numeric thresholds come from src/kpi/bands.base.ts

import * as React from "react";
import { BAND_BASE, BandBaseIds } from "../../kpi/bands.base";
import { KPI_INFO, type KpiInfoDoc } from "../../data/kpis";

/* ------------------------------- Types ----------------------------------- */
export type Tone = "good" | "caution" | "avoid" | "neutral";
export type Band = {
  /** Index in the ordered thresholds/bands arrays */
  slot: number;
  min?: number;
  max?: number;
  label: string;
  guidance: string;
  tone?: Tone;
};

export type BandSet = {
  /** Registry key, aligned with BAND_BASE & bands.json keys */
  id: BandBaseIds;
  title: string;
  description?: string;
  valueScale: "percent" | "raw" | "ratio";
  hasBar: boolean;
  /** Ordered low→high bands; slot 0 = lowest band */
  bands: Band[];
};

export type KpiGuidanceHandle = {
  open: () => void;
  close: () => void;
  openInfo: () => void;
  openSignals: () => void;
};

/* ------------------------------- i18n merge ------------------------------ */
// Eager-load locale dicts. Expected: /src/i18n/en/bands.json, /src/i18n/de/bands.json, ...
const BAND_DICTS = import.meta.glob("/src/i18n/*/bands.json", { eager: true, import: "default" }) as Record<string, any>;

function resolveDict(locale?: string) {
  const lang = (locale?.split("-")[0] || "en");
  return BAND_DICTS[`/src/i18n/${lang}/bands.json`] ?? BAND_DICTS["/src/i18n/en/bands.json"];
}

function getBandSet(kpiId: BandBaseIds, locale?: string): BandSet {
  const base = (BAND_BASE as any)[kpiId];
  if (!base) throw new Error(`Unknown bands id: ${String(kpiId)}`);

  const dictRoot = resolveDict(locale);
  const dictFallback = resolveDict("en");
  const dict = dictRoot?.[kpiId] ?? dictFallback?.[kpiId];
  if (!dict) throw new Error(`Missing i18n for ${String(kpiId)} in ${locale ?? "en"}`);

  const thresholds = Array.isArray(base.thresholds) ? base.thresholds : [];
  const dictBands = Array.isArray(dict.bands) ? dict.bands : [];

  return {
    id: kpiId,
    title: dict.title,
    description: dict.description,
    valueScale: base.valueScale,
    hasBar: base.hasBar,
    bands: thresholds.map((t: any, idx: number) => {
      const d = dictBands[idx];
      if (!d) {
        throw new Error(
          `Missing copy for band #${idx} in ${String(kpiId)} (${locale ?? "en"})`
        );
      }
      return {
        slot: idx,
        min: t.min,
        max: t.max,
        tone: t.tone,
        label: d.label,
        guidance: d.guidance,
      } as Band;
    }),
  };
}

/* --------------------------- Safe bands lookup --------------------------- */
function safeGetBandSet(id?: unknown, locale?: string): BandSet | null {
  if (!id) return null;
  try {
    return getBandSet(id as BandBaseIds, locale);
  } catch (err) {
    console.warn("[Guidance] safeGetBandSet failed for", id, err);
    return null; // tolerate missing bands (info-only KPI)
  }
}

/* ----------------------------- Preferences ------------------------------- */
function useIsClient() {
  const [is, set] = React.useState(false);
  React.useEffect(() => set(true), []);
  return is;
}
function useGuidancePrefs() {
  const isClient = useIsClient();
  const [showBars, setShowBars] = React.useState<boolean>(true);
  React.useEffect(() => {
    if (!isClient) return;
    try { const v = localStorage.getItem("kpi:guidance:bars"); if (v === "0") setShowBars(false); } catch {}
  }, [isClient]);
  React.useEffect(() => {
    if (!isClient) return;
    try { localStorage.setItem("kpi:guidance:bars", showBars ? "1" : "0"); } catch {}
  }, [showBars, isClient]);
  return { showBars, setShowBars };
}

export function GuidanceSwitch({ className }: { className?: string }) {
  const { showBars, setShowBars } = useGuidancePrefs();
  return (
    <button
      type="button"
      onClick={() => setShowBars(!showBars)}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm shadow-sm hover:bg-[var(--surface-50)]/60 border-[var(--border)] ${className ?? ""}`}
      aria-pressed={showBars}
      title="Toggle mini band bars"
    >
      <span className={`h-2 w-2 rounded-full ${showBars ? "bg-emerald-500" : "bg-slate-400"}`} />
      {showBars ? "Guidance: Bar On" : "Guidance: Bar Off"}
    </button>
  );
}

/* -------------------------------- Helpers -------------------------------- */
function toneClass(tone?: Tone) {
  switch (tone) {
    case "good": return "bg-emerald-500";
    case "caution": return "bg-amber-500";
    case "avoid": return "bg-rose-500";
    default: return "bg-slate-400";
  }
}
function formatValue(n: number, scale: BandSet["valueScale"]) {
  if (scale === "percent") return `${Math.round(n)}%`;
  if (scale === "ratio") return Number.isFinite(n) ? n.toFixed(2) : String(n);
  return String(n);
}
function bandFor(value: number | null | undefined, bands: Band[]) {
  if (value == null || Number.isNaN(value)) return null;
  return bands.find((b) => (b.min == null || value >= b.min) && (b.max == null || value < b.max)) || null;
}

/* ------------------------------ Mini Band Bar ---------------------------- */
export function BandBar({ value, set }: { value?: number | null; set: BandSet }) {
  if (!set.hasBar) return null;

  const p = set.valueScale === "percent" ? clampPercent(value) : undefined;
  const pc = typeof p === "number" ? Math.min(98.5, Math.max(1.5, p)) : undefined;

  // first/middle/last lanes if >3 bands
  const lanes: Band[] =
    set.bands.length <= 3
      ? set.bands
      : [set.bands[0], set.bands[Math.floor(set.bands.length / 2)], set.bands[set.bands.length - 1]];

  return (
    <div
      className={`
        relative mt-3 rounded-xl border border-[var(--border)] h-3 overflow-hidden
        [--indicator:theme(colors.neutral.700)]
        dark:[--indicator:#ffffff]
      `}
    >
      {/* lanes */}
      <div className="absolute inset-0 grid grid-cols-3 gap-px opacity-60">
        {lanes.map((b, i) => (
          <div key={b.slot} className={i === 0 ? "bg-rose-500/50" : i === 1 ? "bg-emerald-500/40" : "bg-amber-500/40"} />
        ))}
      </div>

      {/* vertical indicator */}
      {set.valueScale === "percent" && typeof pc === "number" && (
        <div
          aria-hidden
          className="absolute inset-y-0 -translate-x-1/2 z-20 pointer-events-none"
          style={{ left: `${pc}%` }}
        >
          <div className="h-full w-[4px] rounded-sm" style={{ backgroundColor: "var(--indicator)" }} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Drawer --------------------------------- */
function DrawerTabs({
  hasInfo, hasSignals, tab, setTab,
}: { hasInfo: boolean; hasSignals: boolean; tab: "info" | "signals"; setTab: (t: "info" | "signals") => void }) {
  // Only show tabs if we actually have both views
  if (!(hasInfo && hasSignals)) return null;
  return (
    <div className="px-5 pt-2">
      <div className="inline-flex rounded-xl border border-[var(--border)] p-1 text-xs">
        <button
          className={`px-3 py-1.5 rounded-lg ${tab === "info" ? "bg-[var(--surface-900)]" : "hover:bg-[var(--surface-900)]/60"}`}
          onClick={() => setTab("info")}
        >Info</button>
        <button
          className={`px-3 py-1.5 rounded-lg ${tab === "signals" ? "bg-[var(--surface-900)]" : "hover:bg-[var(--surface-900)]/60"}`}
          onClick={() => setTab("signals")}
        >Signals</button>
      </div>
    </div>
  );
}

export function GuidanceDrawer({
  open, onClose, value, set, infoTitle, info, tab, setTab,
}: {
  open: boolean;
  onClose: () => void;
  value?: number | null;
  set?: BandSet | null;
  infoTitle?: string;
  info?: React.ReactNode;
  tab: "info" | "signals";
  setTab: (t: "info" | "signals") => void;
}) {
  const active = set ? bandFor(value ?? null, set.bands) : null;

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hasSignals = !!set && Array.isArray(set.bands) && set.bands.length > 0;

  return (
    <div aria-hidden={!open}>
      <div className={`fixed inset-0 z-40 transition-opacity ${open ? "bg-black/40 opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside
        role="dialog" aria-modal="true" aria-label={infoTitle || set?.title || "Guidance"}
        className={`fixed right-0 top-0 z-50 h-full w-[380px] max-w-[90vw]
              bg-[var(--surface-950)] text-[var(--fg)]
              shadow-2xl border-l border-[var(--border)]
              transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{
          backgroundColor: "var(--surface-950, #0b1020)",
          color: "var(--fg, #e2e8f0)",
          borderColor: "var(--border, #1e293b)"
        }}
      >
        <div className="flex h-full flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-black/10 dark:border-white/10">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-neutral-100 dark:bg-neutral-800 p-2">
                <span className="block h-6 w-6 rounded-md bg-gradient-to-br from-neutral-300 to-neutral-500 dark:from-neutral-700 dark:to-neutral-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-tight">{infoTitle || set?.title || "Guidance"}</h2>
                {tab === "signals" && set?.description && (
                  <p className="text-xs text-[var(--fg-muted)]">{set.description}</p>
                )}
              </div>
              <button onClick={onClose} className="ml-auto rounded-lg border border-black/10 dark:border-white/10 px-2 py-1 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800">Close</button>
            </div>
            {typeof value === "number" && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                <span className="font-medium">Now</span>
                <span className="tabular-nums">{formatValue(value, set?.valueScale ?? "raw")}</span>
                {active && <span className={`ml-2 h-2 w-2 rounded-full ${toneClass(active.tone)}`} />}
              </div>
            )}
          </div>

          <DrawerTabs hasInfo={!!info} hasSignals={hasSignals} tab={tab} setTab={setTab} />

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {info && tab === "info" && (
              <section>
                <h3 className="mb-2 text-sm font-medium text-[var(--fg)]">Overview</h3>
                <div className="prose prose-invert max-w-none text-sm">{info}</div>
              </section>
            )}

            {tab === "signals" && hasSignals && set && (
              <>
                <section>
                  <h3 className="mb-2 text-sm font-medium text-[var(--fg)]">Signal bands</h3>
                  <ul className="space-y-2">
                    {set.bands.map((b) => {
                      const isActive = active?.slot === b.slot;
                      return (
                        <li key={b.slot} className={`rounded-xl border p-3 ${isActive ? "border-[var(--fg)] bg-[var(--surface-900)]" : "border-[var(--border)]"}`}>
                          <div className="flex items-start gap-3">
                            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${toneClass(b.tone)}`} />
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium">{b.label}</span>
                                {isActive && <span className="rounded-full bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 px-2 py-0.5 text-[10px]">current</span>}
                              </div>
                              <p className="text-sm text-[var(--fg-muted)]">{b.guidance}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {set.hasBar && set.valueScale === "percent" && (
                  <section className="pt-1">
                    <h3 className="mb-2 text-sm font-medium text-[var(--fg)]">Distribution (0–100)</h3>
                    <BandBar value={value} set={set} />
                    <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                      Pointer shows current reading on a 0–100 scale. Bands highlight suggested posture.
                    </p>
                  </section>
                )}
              </>
            )}
          </div>

          <div className="border-t border-[var(--border)] px-5 py-3 flex items-center justify-end gap-2">
            <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-900)]" onClick={onClose}>Close</button>
            <button className="rounded-xl px-3 py-2 text-sm font-medium shadow hover:opacity-90 bg-[var(--fg)] text-[var(--surface-950)]" onClick={onClose}>
              Apply & Close
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* --------------------------- Helper -------------------------- */

function renderInfoDoc(doc: KpiInfoDoc): React.ReactNode {
  return (
    <div className="space-y-3">
      {(doc.paragraphs ?? []).map((p, i) => (
        <p key={`p-${i}`} className="leading-relaxed">
          {p}
        </p>
      ))}
      {doc.bullets && doc.bullets.length > 0 && (
        <ul className="list-disc pl-5 space-y-1">
          {doc.bullets.map((b, i) => (
            <li key={`b-${i}`}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const clampPercent = (v: number | null | undefined): number => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 100 ? 100 : n;
};

/* --------------------------- Controller wrapper -------------------------- */
type KpiGuidanceProps = {
  /** Bands id (for signals / thresholds). Optional for info-only KPIs. */
  kpiId?: BandBaseIds | string;
  /** If you want a different id for bands than infoKey/kpiId, pass this. */
  bandsKey?: BandBaseIds | string;
  /** Current numeric value for contextualization. */
  value?: number | null;
  /** Override hasBar; if omitted, uses set.hasBar (when bands exist). */
  showBar?: boolean;
  /** e.g., "en", "de-DE" */
  locale?: string;
  /** Hide inline button when embedded in a card with its own trigger. */
  trigger?: "inline" | "external";
  /** Info title override (otherwise pulled from KPI_INFO[infoKey]?.title). */
  infoTitle?: string;
  /** Direct React node for Info; if omitted, pulled from KPI_INFO[infoKey]. */
  info?: React.ReactNode;
  /** Key for info copy (from data/kpis). Can be different from bands id. */
  infoKey?: keyof typeof KPI_INFO | string;
};

export const KpiGuidance = React.forwardRef<KpiGuidanceHandle, KpiGuidanceProps>(function KpiGuidance(
  { kpiId, bandsKey, value, showBar, locale, trigger = "inline", infoTitle, info, infoKey }: KpiGuidanceProps,
  ref
) {
  const bandsId = bandsKey ?? kpiId;
  const set = React.useMemo(() => safeGetBandSet(bandsId, locale), [bandsId, locale]);

  const infoDoc = React.useMemo(() => (infoKey ? (KPI_INFO as any)[infoKey] : undefined), [infoKey]);
  const resolvedInfoTitle = React.useMemo(() => infoTitle ?? infoDoc?.title, [infoTitle, infoDoc]);
  const resolvedInfo = React.useMemo(
    () => info ?? (infoDoc ? renderInfoDoc(infoDoc) : undefined),
    [info, infoDoc]
  );

  const hasSignals = !!set && Array.isArray(set.bands) && set.bands.length > 0;
  const hasInfo = !!resolvedInfo;

  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"info" | "signals">(hasInfo ? "info" : "signals");

  // Keep tab valid if availability changes
  React.useEffect(() => {
    if (tab === "signals" && !hasSignals && hasInfo) setTab("info");
    if (tab === "info" && !hasInfo && hasSignals) setTab("signals");
  }, [hasSignals, hasInfo, tab]);

  const { showBars } = useGuidancePrefs();
  const enableBar = !!set && (showBar ?? set.hasBar) && set.valueScale === "percent" && showBars;

  React.useImperativeHandle(ref, () => ({
    open: () => { setOpen(true); },
    openInfo: () => { if (hasInfo) setTab("info"); setOpen(true); },
    openSignals: () => { if (hasSignals) setTab("signals"); setOpen(true); },
    close: () => setOpen(false),
  }), [hasInfo, hasSignals]);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        {enableBar && set && <div className="flex-1"><BandBar value={value} set={set} /></div>}
        {trigger === "inline" && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-900)]"
          >
            What to do now?
          </button>
        )}
      </div>

      <GuidanceDrawer
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        set={set}
        infoTitle={resolvedInfoTitle}
        info={resolvedInfo}
        tab={tab}
        setTab={setTab}
      />
    </div>
  );
});
