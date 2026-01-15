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
    try { const v = localStorage.getItem("kpi:guidance:bars"); if (v === "0") setShowBars(false); } catch { }
  }, [isClient]);
  React.useEffect(() => {
    if (!isClient) return;
    try { localStorage.setItem("kpi:guidance:bars", showBars ? "1" : "0"); } catch { }
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

function toneToCss(tone?: Tone) {
  // Per your mapping:
  // - avoid = red
  // - caution/warning = orange
  // - good + neutral = blue
  switch (tone) {
    case "avoid": return "var(--signal-avoid)";
    case "caution": return "var(--signal-warn)";
    case "good":
    case "neutral":
    default:
      return "var(--signal-good)";
  }
}

type ToneSeg = { a: number; b: number; c: string };

function clamp01(v: number, lo = 0, hi = 100) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Build segments across 0..100 using the band tones; fill gaps as neutral.
function buildToneSegments(bands: Band[], lo = 0, hi = 100): ToneSeg[] {
  const cuts = new Set<number>([lo, hi]);

  for (const b of bands) {
    if (typeof b.min === "number" && Number.isFinite(b.min)) cuts.add(clamp01(b.min, lo, hi));
    if (typeof b.max === "number" && Number.isFinite(b.max)) cuts.add(clamp01(b.max, lo, hi));
  }

  const xs = Array.from(cuts).sort((a, b) => a - b);
  const segs: ToneSeg[] = [];

  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    if (b <= a) continue;

    const mid = (a + b) / 2;
    const hit = bandFor(mid, bands);              // uses your band logic
    const c = toneToCss(hit?.tone ?? "neutral");  // fill gaps as neutral

    const prev = segs[segs.length - 1];
    if (prev && prev.c === c) prev.b = b;
    else segs.push({ a, b, c });
  }

  // Ensure we always cover full [lo..hi]
  if (segs.length === 0) segs.push({ a: lo, b: hi, c: toneToCss("neutral") });
  return segs;
}

// Turn segments into a smooth gradient with soft transitions at boundaries
function buildBandGradient(bands: Band[], lo = 0, hi = 100) {
  const segs = buildToneSegments(bands, lo, hi);
  if (segs.length === 1) return `linear-gradient(90deg, ${segs[0].c} 0%, ${segs[0].c} 100%)`;

  const SMOOTH = 4.8; // % width for blending (small = subtle)
  const stops: string[] = [];

  // Start
  stops.push(`${segs[0].c} ${segs[0].a.toFixed(2)}%`);

  for (let i = 0; i < segs.length - 1; i++) {
    const left = segs[i];
    const right = segs[i + 1];
    const p = left.b;

    const leftW = (left.b - left.a) / 2;
    const rightW = (right.b - right.a) / 2;
    const w = Math.max(0, Math.min(SMOOTH, leftW, rightW));

    // blend around boundary p
    stops.push(`${left.c} ${(p - w).toFixed(2)}%`);
    stops.push(`${right.c} ${(p + w).toFixed(2)}%`);
  }

  // End
  const last = segs[segs.length - 1];
  stops.push(`${last.c} ${last.b.toFixed(2)}%`);

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function isZeroToHundredBands(bands: Band[]) {
  return bands.every((b) =>
    (b.min == null || (b.min >= 0 && b.min <= 100)) &&
    (b.max == null || (b.max >= 0 && b.max <= 100))
  );
}

function buildSlotGradient(bands: Band[]) {
  // Use the tones in slot order (low -> high), equal widths, smooth transitions
  const raw = bands.map((b) => toneToCss(b.tone ?? "neutral"));

  // Merge adjacent equal colors
  const colors: string[] = [];
  for (const c of raw) {
    if (colors.length === 0 || colors[colors.length - 1] !== c) colors.push(c);
  }
  if (colors.length === 0) return `linear-gradient(90deg, ${toneToCss("neutral")} 0%, ${toneToCss("neutral")} 100%)`;
  if (colors.length === 1) return `linear-gradient(90deg, ${colors[0]} 0%, ${colors[0]} 100%)`;

  const n = colors.length;
  const w = 100 / n;
  const SMOOTH = Math.min(4.0, w * 0.35); // blend width

  const stops: string[] = [];
  stops.push(`${colors[0]} 0%`);

  for (let i = 0; i < n - 1; i++) {
    const p = (i + 1) * w;
    stops.push(`${colors[i]} ${(p - SMOOTH).toFixed(2)}%`);
    stops.push(`${colors[i + 1]} ${(p + SMOOTH).toFixed(2)}%`);
  }

  stops.push(`${colors[n - 1]} 100%`);
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function buildTrackGradientForSet(set: BandSet) {
  // Only use numeric 0..100 mapping when it actually makes sense
  if (set.valueScale === "percent" && isZeroToHundredBands(set.bands)) {
    return buildBandGradient(set.bands, 0, 100);
  }
  // Otherwise: follow band order (slot-based), which matches “bands logic”
  return buildSlotGradient(set.bands);
}

/* ------------------------------ Mini Band Bar ---------------------------- */
export function BandBar({ value, set }: { value?: number | null; set: BandSet }) {
  if (!set.hasBar) return null;

  function finite(n: any): n is number {
    return typeof n === "number" && Number.isFinite(n);
  }

  function clampMarkerPc(pc: number) {
    return Math.min(98.5, Math.max(1.5, pc));
  }

  function deriveRangeFromBands(
    bands: Array<{ min?: number; max?: number }>,
    v: number | null | undefined
  ) {
    const mins: number[] = [];
    const maxs: number[] = [];
    let hasOpenLow = false;
    let hasOpenHigh = false;

    for (const b of bands) {
      if (finite(b.min)) mins.push(b.min);
      else hasOpenLow = true;

      if (finite(b.max)) maxs.push(b.max);
      else hasOpenHigh = true;
    }

    // Base range from thresholds (fallbacks if missing)
    let lo =
      mins.length > 0 ? Math.min(...mins) : 0;

    let hi =
      maxs.length > 0
        ? Math.max(...maxs)
        : mins.length > 0
          ? Math.max(...mins) + 1
          : 1;

    // If we have an open-low band, 0 is usually a sensible baseline for "raw" scales (e.g., |z|)
    if (hasOpenLow) lo = Math.min(lo, 0);

    // Ensure current value fits (helps open-ended top band)
    if (finite(v)) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }

    // Degenerate safety
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
      lo = 0;
      hi = 1;
    }

    // Small padding so marker doesn’t hug the edges (especially for open-ended bands)
    const span = hi - lo;
    const pad = span * 0.05;
    if (pad > 0) {
      lo -= pad;
      hi += pad;
    }

    return { lo, hi };
  }

  function valueToMarkerPc(v: number | null | undefined, set: BandSet): number | undefined {
    if (!finite(v)) return undefined;

    if (set.valueScale === "percent") {
      const p = clampPercent(v); // expected to return 0..100
      return clampMarkerPc(p);
    }

    // raw/other: map to 0..100 based on band threshold span
    const { lo, hi } = deriveRangeFromBands(set.bands, v);
    const pc = ((v - lo) / (hi - lo)) * 100;
    if (!Number.isFinite(pc)) return undefined;
    return clampMarkerPc(pc);
  }

  const pc = React.useMemo(() => valueToMarkerPc(value ?? null, set), [value, set]);

  const active = bandFor(value ?? null, set.bands);

  // Marker should be white
  const markerWhite = "rgba(255,255,255,0.92)";

  const trackGradient = React.useMemo(() => buildTrackGradientForSet(set), [set]);

  return (
    // OUTER wrapper: allows indicator to overflow (no cropping)
    <div className="relative mt-3 h-3 overflow-visible">
      {/* INNER track: keeps rounded ends clipped */}
      <div className="absolute inset-0 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-900)]">
        {/* gradient */}
        <div
          className="absolute inset-0 opacity-95"
          style={{ backgroundImage: trackGradient }}
        />
        {/* subtle highlight */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 60%)",
          }}
        />
      </div>

      {/* INDICATOR (white): rendered in outer wrapper so it won't be clipped */}
      {typeof pc === "number" && (
        <div
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
          style={{ left: `${pc}%` }}
        >
          <div className="relative h-6">
            {/* needle */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-6 rounded-sm"
              style={{
                backgroundColor: markerWhite,
                boxShadow: "0 0 10px rgba(255,255,255,0.22)",
              }}
            />
            {/* dot */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.95)",
                boxShadow:
                  "0 0 0 2px rgba(0,0,0,0.35), 0 0 14px rgba(255,255,255,0.20)",
              }}
            />
          </div>
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
  const enableBar = !!set && (showBar ?? set.hasBar) && showBars;

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
