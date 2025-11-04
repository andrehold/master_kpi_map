import React, { useMemo, useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Filter,
  Download,
  Sun,
  Moon,
  Cloud,
} from "lucide-react";
import kpiStrings from "./i18n/en/kpi.json";
import { useDeribitDvol } from "./hooks/useDeribitDvol";
import { useIvrFromDvol } from "./hooks/useIvrFromDvol";
import { useIVTermStructure } from "./hooks/useIVTermStructure";
import { useDeribitSkew25D } from './hooks/useDeribitSkew25D';
import { useTermStructureKink } from "./hooks/useTermStructureKink";
import { useRealizedVol } from "./hooks/useRealizedVol";
import ExpectedMoveRibbonCard from "./components/ExpectedMoveRibbonCard";
import { useRvEmFactor } from "./hooks/useRvEmFactor";

/**
 * Master KPI Map – Light layout (Trade Manager style) with Dark Mode ready
 * Tech: React (Vite-ready) + Tailwind (token-driven via CSS vars)
 *
 * Light default, dark-mode toggle, tokenized colors.
 */

// --- Strategies --------------------------------------------------------------
const STRATEGIES = [
  "Expected Move",
  "Range-Bound Premium",
  "Carry Trade",
  "0DTE Overwrite",
  "Weekend Vol",
  "Parity Edge",
  "Box Financing",
] as const;

type Strategy = typeof STRATEGIES[number];

type KPIValueType =
  | "percent"
  | "ratio"
  | "bps"
  | "sigma"
  | "index"
  | "ivrank"
  | "ms"
  | "price"
  | "text"
  | "custom";

interface KPIDef {
  id: string;
  name: string;
  description?: string;
  strategies: Strategy[];
  valueType: KPIValueType;
}

interface KPIGroup {
  id: string;
  title: string;
  kpis: KPIDef[];
}

// --- Master KPI Catalog (from spec) -----------------------------------------
const KPI_GROUPS: KPIGroup[] = [
  {
    id: "vol-skew",
    title: "1. Volatility & Skew Metrics",
    kpis: [
      {
        id: "atm-iv",
        name: "ATM Implied Volatility (IV)",
        strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"],
        valueType: "percent",
      },
      {
        id: "ivr",
        name: "IV Rank / Percentile (IVR)",
        strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"],
        valueType: "ivrank",
      },
      {
        id: "term-structure",
        name: "IV Term Structure (Contango vs Backwardation)",
        strategies: ["Expected Move", "Carry Trade", "0DTE Overwrite"],
        valueType: "text",
      },
      {
        id: "skew-25d-rr",
        name: "Skew (25Δ Risk Reversal)",
        strategies: ["Expected Move", "Weekend Vol", "Carry Trade", "0DTE Overwrite"],
        valueType: "price",
      },
      {
        id: "vol-of-vol",
        name: "Vol-of-Vol (VVIX/MOVE/intraday IV)",
        strategies: ["Expected Move", "0DTE Overwrite"],
        valueType: "index",
      },
      {
        id: "ts-kink",
        name: "Term Structure Kink (0DTE vs 1–3DTE IV)",
        strategies: ["0DTE Overwrite"],
        valueType: "percent",
      },
    ],
  },
  {
    id: "rv-vs-iv",
    title: "2. Realized vs Implied (RV vs IV)",
    kpis: [
      { id: "rv", name: "Realized Volatility (RV)", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite"], valueType: "percent" },
      { id: "iv-rv-spread", name: "IV–RV Spread", strategies: ["Expected Move", "Range-Bound Premium", "Carry Trade"], valueType: "percent" },
      { id: "em-hit-rate", name: "Hit Rate of Expected Move", strategies: ["Expected Move"], valueType: "percent" },
      { id: "rv-em-factor", name: "Over/Under Pricing Factor (RV ÷ EM)", strategies: ["Expected Move"], valueType: "ratio" },
      { id: "short-horizon-atr", name: "Short-horizon realized σ / intraday ATR vs EM", strategies: ["0DTE Overwrite"], valueType: "sigma" },
      { id: "em-ribbon", name: "Expected Move Ribbon", strategies: ["Expected Move"], valueType: "custom" },
    ],
  },
  {
    id: "regime-macro",
    title: "3. Market Regime & Macro Filters",
    kpis: [
      { id: "vix-vvix", name: "VIX / VVIX levels & jumps", strategies: ["Expected Move"], valueType: "index" },
      { id: "cross-asset-vol", name: "Cross-asset vol benchmarks (MOVE/FX/Credit)", strategies: ["Expected Move"], valueType: "index" },
      { id: "implied-corr", name: "Equity correlation (implied correlation index)", strategies: ["Expected Move"], valueType: "percent" },
      { id: "macro-events", name: "Macro risk events (Fed/CPI/NFP/etc.)", strategies: ["Expected Move", "Weekend Vol", "Range-Bound Premium", "Carry Trade", "0DTE Overwrite", "Box Financing"], valueType: "text" },
      { id: "event-collapse", name: "Event premium collapse", strategies: ["Carry Trade"], valueType: "percent" },
    ],
  },
  {
    id: "micro-flow",
    title: "4. Microstructure, Flows & Liquidity",
    kpis: [
      { id: "funding", name: "Funding rates (perps)", strategies: ["Weekend Vol", "Range-Bound Premium", "0DTE Overwrite"], valueType: "percent" },
      { id: "basis", name: "Spot–perp / futures basis", strategies: ["0DTE Overwrite", "Parity Edge", "Box Financing"], valueType: "percent" },
      { id: "oi-concentration", name: "Open interest concentration (pin risk)", strategies: ["Weekend Vol", "Parity Edge", "0DTE Overwrite"], valueType: "percent" },
      { id: "gamma-walls", name: "Gamma “walls” near strikes", strategies: ["0DTE Overwrite", "Parity Edge"], valueType: "price" },
      { id: "liquidity-stress", name: "Liquidity stress (spreads/depth)", strategies: ["Expected Move", "Weekend Vol", "Range-Bound Premium", "Parity Edge", "0DTE Overwrite", "Box Financing"], valueType: "percent" },
      { id: "orderbook-health", name: "Order book slope / staleness / depth resilience", strategies: ["Parity Edge"], valueType: "percent" },
    ],
  },
  {
    id: "strategy-health",
    title: "5. Strategy-Specific Health Metrics",
    kpis: [
      { id: "condor-credit-em", name: "Condor Credit % of EM", strategies: ["Expected Move"], valueType: "percent" },
      { id: "maxloss-credit", name: "Max Loss ÷ Expected Credit Ratio", strategies: ["Expected Move"], valueType: "ratio" },
      { id: "delta-gamma-near-shorts", name: "Delta & Gamma exposure near short strikes", strategies: ["Expected Move", "Range-Bound Premium"], valueType: "price" },
      { id: "portfolio-vega-theta", name: "Portfolio Vega & Theta exposure", strategies: ["Expected Move", "Carry Trade"], valueType: "price" },
      { id: "pnl-vs-premium", name: "Position PnL vs Premium Collected", strategies: ["Range-Bound Premium"], valueType: "percent" },
      { id: "reversion-half-life", name: "Reversion half-life of Δ (parity dev)", strategies: ["Parity Edge"], valueType: "price" },
      { id: "edge-z", name: "Edge z-score", strategies: ["Parity Edge"], valueType: "sigma" },
      { id: "box-financing-spread", name: "Box financing spread (r_imp – CoC)", strategies: ["Box Financing"], valueType: "bps" },
      { id: "ex-div-early-ex", name: "Ex-dividend / early exercise risk", strategies: ["Box Financing"], valueType: "percent" },
    ],
  },
  {
    id: "execution-costs",
    title: "6. Execution & Cost KPIs",
    kpis: [
      { id: "fill-ratio", name: "Fill ratio", strategies: ["Parity Edge"], valueType: "percent" },
      { id: "maker-taker", name: "Maker/taker rate & rebates", strategies: ["Parity Edge"], valueType: "percent" },
      { id: "slippage", name: "Arrival price slippage (per leg, per kit)", strategies: ["Parity Edge", "Box Financing"], valueType: "bps" },
      { id: "legging-risk", name: "Legging risk realized", strategies: ["Parity Edge"], valueType: "percent" },
      { id: "time-to-fill", name: "Time-to-fill & reprice count", strategies: ["Parity Edge"], valueType: "ms" },
      { id: "breakage", name: "Breakage rate", strategies: ["Parity Edge"], valueType: "percent" },
      { id: "fees-spread", name: "Total fees & effective spread paid", strategies: ["Parity Edge", "Box Financing"], valueType: "bps" },
      { id: "infra-errors", name: "Infra costs & error rates", strategies: ["Parity Edge", "Box Financing"], valueType: "percent" },
    ],
  },
  {
    id: "risk-pnl",
    title: "7. Risk, Capital & P&L",
    kpis: [
      { id: "max-dd-calmar", name: "Max drawdown & Calmar ratio", strategies: ["Expected Move"], valueType: "percent" },
      { id: "locked-vs-realized", name: "Locked vs realized edge (capture ratio)", strategies: ["Parity Edge"], valueType: "percent" },
      { id: "stress-tests", name: "Stress tests (±Y% spot, liquidity haircut)", strategies: ["Parity Edge", "Expected Move"], valueType: "percent" },
      { id: "capital-utilization", name: "Capital utilization / margin footprint (Reg‑T vs PM)", strategies: ["Box Financing", "Parity Edge"], valueType: "percent" },
      { id: "concentration-limits", name: "Concentration limits", strategies: ["Parity Edge", "Box Financing"], valueType: "percent" },
      { id: "utilization-vs-caps", name: "Utilization vs daily/expiry risk caps", strategies: ["Carry Trade", "Parity Edge", "Box Financing"], valueType: "percent" },
    ],
  },
  {
    id: "ops-process",
    title: "8. Operational & Process Health",
    kpis: [
      { id: "latency", name: "Latency (e2e ms)", strategies: ["Parity Edge"], valueType: "ms" },
      { id: "data-freshness", name: "Data freshness (book staleness %)", strategies: ["Parity Edge"], valueType: "percent" },
      { id: "uptime", name: "Automation uptime / kill-switch triggers", strategies: ["Parity Edge"], valueType: "percent" },
    ],
  },
];

// --- Sample value generation -------------------------------------------------
function rand(min: number, max: number, decimals = 1) {
  const v = Math.random() * (max - min) + min;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function sampleFor(type: KPIValueType): string {
  switch (type) {
    case "percent": return `${rand(0, 150, 1).toFixed(1)}%`;
    case "ivrank": return `${Math.round(rand(0, 100, 0))}`;
    case "ratio": return `${rand(0.3, 2.5, 2).toFixed(2)}×`;
    case "bps": return `${Math.round(rand(0, 150, 0))} bps`;
    case "sigma": return `${rand(0.1, 5.0, 2).toFixed(2)}σ`;
    case "index": return `${rand(5, 60, 1).toFixed(1)}`;
    case "ms": return `${Math.round(rand(8, 120, 0))} ms`;
    case "price": return `${rand(-3.5, 3.5, 2).toFixed(2)}`;
    case "text": {
      const isContango = Math.random() > 0.35;
      const v = rand(0.0, 8.0, 1) * (isContango ? 1 : -1);
      return `${isContango ? "Contango" : "Backwardation"} (${v.toFixed(1)}%)`;
    }
    case "custom": return "—";
    default: return "—";
  }
}

const ALL_KPIS = KPI_GROUPS.flatMap((g) => g.kpis.map((k) => k.id));

type Samples = Record<string, string>;

function buildSamples(): Samples {
  const s: Samples = {};
  for (const gid of ALL_KPIS) {
    const k = KPI_GROUPS.flatMap((g) => g.kpis).find((x) => x.id === gid)!;
    s[gid] = sampleFor(k.valueType);
  }
  return s;
}

// --- Theme tokens ------------------------------------------------------------
const TOKENS = {
  light: {
    colorScheme: "light",
    bg: "#F6F8FC", // canvas
    surface950: "#FFFFFF", // cards / panels
    surface900: "#F8FAFF", // secondary surface / headers
    border: "#E2E8F0",
    shadow: "0 1px 2px rgba(16,24,40,.04), 0 1px 1px rgba(16,24,40,.06)",
    fg: "#0F172A",
    fgMuted: "#64748B",
    brand400: "#60A5FA",
    brand500: "#2563EB",
    brand600: "#1D4ED8",
  },
  dark: {
    colorScheme: "dark",
    bg: "#0a0f1a",
    surface950: "#0b1020",
    surface900: "#0e1629",
    border: "#1e293b",
    shadow: "0 1px 0 rgba(255,255,255,0.04)",
    fg: "#e2e8f0",
    fgMuted: "#94a3b8",
    brand400: "#22d3ee",
    brand500: "#6366f1",
    brand600: "#4f46e5",
  },
} as const;

type ThemeKey = keyof typeof TOKENS;

function TokenStyles({ theme }: { theme: ThemeKey }) {
  const t = TOKENS[theme];
  const css = `
    :root, [data-theme="tm"]{
      --color-scheme:${t.colorScheme};
      --bg:${t.bg};
      --surface-950:${t.surface950};
      --surface-900:${t.surface900};
      --border:${t.border};
      --shadow:${t.shadow};
      --fg:${t.fg};
      --fg-muted:${t.fgMuted};
      --brand-400:${t.brand400};
      --brand-500:${t.brand500};
      --brand-600:${t.brand600};
      --radius-lg:.5rem; --radius-xl:.75rem; --radius-2xl:1rem;
    }
  `;
  return <style>{css}</style>;
}

// --- Small UI primitives -----------------------------------------------------
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-900)] text-[10px] text-[var(--fg-muted)]">
      {children}
    </span>
  );
}

function StrategyTag({ label, active = false, onClick }: { label: Strategy; active?: boolean; onClick?: () => void }) {
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

function GroupHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
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

function KpiCard({ kpi, value, meta, extraBadge }: { kpi: KPIDef; value: string; meta?: string; extraBadge?: string | null; }) {
  const desc = kpi.description ?? (kpiStrings as any)?.kpis?.[kpi.id] ?? "";
  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-950)] p-4 shadow-[var(--shadow)] hover:border-[var(--brand-500)]/30 transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[var(--fg)] font-medium leading-snug">{kpi.name}</div>
          {desc && (
            <div className="text-xs text-[var(--fg-muted)] mt-0.5">{desc}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums font-mono text-[var(--fg)]">{value}</div>
          <div className="mt-1 flex items-center gap-1 justify-end">
            {extraBadge ? <Badge>{extraBadge}</Badge> : null}
            <div className="text-[10px] text-[var(--fg-muted)] flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--fg-muted)]" />
              {meta ?? "sample"}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {kpi.strategies.map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded-full text-[10px] border border-[var(--border)] text-[var(--fg-muted)] bg-[var(--surface-900)]"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Main --------------------------------------------------------------------
export default function MasterKPIMapDemo() {
  const [search, setSearch] = useState("");
  const [activeStrategies, setActiveStrategies] = useState<Strategy[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    KPI_GROUPS.forEach((g) => {
      init[g.id] = true;
    });
    return init;
  });
  const [samples, setSamples] = useState<Samples>(() => buildSamples());
  const [theme, setTheme] = useState<ThemeKey>("light");
  const [isUpdating, setIsUpdating] = useState(false);

  // Live data (BTC by default)
  const { valuePct: dvolPct, lastUpdated: dvolTs, loading: dvolLoading, error: dvolError, refresh: refreshDvol } = useDeribitDvol("BTC");
  const { ivr, ivp, lastUpdated: ivrTs, loading: ivrLoading, error: ivrError, refresh: refreshIvr } = useIvrFromDvol("BTC");
  // IV Term Structure (BTC by default)
  const { data: tsData, loading: tsLoading, error: tsError, reload: refreshTerm } = useIVTermStructure({
    currency: "BTC",
    maxExpiries: 6,
    bandPct: 0.07,    // optional: consider strikes within ±7% of spot
    minDteHours: 12,  // skip expiries expiring very soon
    // refreshMs: 15000, // optional polling
  });
  // Skew (25Δ Risk Reversal) – multiple tenors side-by-side
  const skew7  = useDeribitSkew25D({ currency: "BTC", targetDays: 7  });
  const skew30  = useDeribitSkew25D({ currency: "BTC", targetDays: 30  });
  const skew60  = useDeribitSkew25D({ currency: "BTC", targetDays: 60  });
  const skewLoadingAny = !!(skew7.loading || skew30.loading || skew60.loading);
  const skewErrorAny   = skew7.error || skew30.error || skew60.error;

  const { data: skData, loading: skLoading, error: skError, refresh: refreshSK } = useTermStructureKink("BTC", { pollMs: 0 });

  // Realized Volatility (BTC): 20D daily RV from PERPETUAL closes
  const { rv: rv20d, lastUpdated: rvTs, loading: rvLoading, error: rvError, refresh: refreshRV } = useRealizedVol({ currency: "BTC", windowDays: 20, resolutionSec: 86400, annualizationDays: 365 });

  useEffect(() => { setSamples(buildSamples()); }, []);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return KPI_GROUPS.map((group) => {
      const kpis = group.kpis.filter((k) => {
        const matchesText = !q || k.name.toLowerCase().includes(q) || k.id.toLowerCase().includes(q);
        const matchesStrategy = activeStrategies.length === 0 || activeStrategies.some((s) => k.strategies.includes(s));
        return matchesText && matchesStrategy;
      });
      return { ...group, kpis } as KPIGroup;
    }).filter((g) => g.kpis.length > 0);
  }, [search, activeStrategies]);

  const totalKpis = KPI_GROUPS.reduce((acc, g) => acc + g.kpis.length, 0);
  const visibleKpis = filteredGroups.reduce((acc, g) => acc + g.kpis.length, 0);

  function toggleStrategy(s: Strategy) {
    setActiveStrategies((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }
  function toggleGroup(id: string) { setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] })); }
  function regenerate() { setSamples(buildSamples()); }
  function exportJSON() {
    const payload = {
      generated_at: new Date().toISOString(),
      strategies: STRATEGIES,
      groups: KPI_GROUPS.map((g) => ({
        id: g.id,
        title: g.title,
        kpis: g.kpis.map((k) => ({ id: k.id, name: k.name, strategies: k.strategies, value: samples[k.id] })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `master-kpi-map-sample-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function refreshLive() {
    if (isUpdating) return;
    setIsUpdating(true);
    console.time("update");
    try {
      // 1) Light KPIs first: DVOL → IVR → RV
      try { await refreshDvol(); } catch {}
      await new Promise(r => setTimeout(r, 120));
      try { await refreshIvr(); } catch {}
      await new Promise(r => setTimeout(r, 120));
      try { await refreshRV(); } catch {}

      // 2) Then IV Term Structure & Kink (heavier)
      await new Promise(r => setTimeout(r, 150));
      try { await refreshTerm(); } catch {}
      await new Promise(r => setTimeout(r, 150));
      try { refreshSK(); } catch {}

      // 3) Finally multiple skews (fan out)
      await new Promise(r => setTimeout(r, 150));
      skew7.refresh?.();
      await new Promise(r => setTimeout(r, 150));
      skew30.refresh?.();
      await new Promise(r => setTimeout(r, 150));
      skew60.refresh?.();
    } finally {
      console.timeEnd("update");
      setIsUpdating(false);
    }
  }

  return (
    <div data-theme="tm" style={{ colorScheme: TOKENS[theme].colorScheme as any }} className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <TokenStyles theme={theme} />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[var(--surface-950)]/95 border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-400)] text-white grid place-items-center shadow-[var(--shadow)]">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l8 4-8 4-8-4 8-4Z"/><path d="M4 11l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Master KPI Map</h1>
              <p className="text-xs text-[var(--fg-muted)] -mt-0.5">Across All Strategies</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-3 text-xs text-[var(--fg-muted)]">
              <span className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] shadow-[var(--shadow)]">
                KPIs <span className="font-mono">{visibleKpis}</span>/<span className="font-mono">{totalKpis}</span>
              </span>
              <span className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] shadow-[var(--shadow)]">
                Groups <span className="font-mono">{filteredGroups.length}</span>/8
              </span>
              {dvolTs && (
                <span className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] text-xs text-[var(--fg-muted)] shadow-[var(--shadow)]">
                  DVOL {new Date(dvolTs).toLocaleTimeString()}
                </span>
              )}
              {ivrTs && (
                <span className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] text-xs text-[var(--fg-muted)] shadow-[var(--shadow)]">
                  IVR {new Date(ivrTs).toLocaleDateString()}
                </span>
              )}
              {tsData?.asOf && (
                <span className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] text-xs text-[var(--fg-muted)] shadow-[var(--shadow)]">
                  IV TS {new Date(tsData.asOf).toLocaleTimeString()}
                </span>
              )}
              {(dvolError || ivrError || tsError || skewErrorAny || skError || rvError) && (
                <span className="px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {dvolError || ivrError || tsError || skewErrorAny || skError || rvError}
                </span>
              )}
              {skData?.asOf && (
                <span className="px-2 py-1 rounded-lg bg-[var(--surface-900)] border border-[var(--border)] text-xs text-[var(--fg-muted)] shadow-[var(--shadow)]">
                  0–3D Kink {new Date(skData.asOf).toLocaleTimeString()}
                </span>
              )}
            </div>

            <button onClick={regenerate} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)]">
              <RefreshCw className="w-4 h-4" /> Samples
            </button>

            {/* Update: refresh DVOL + IVR/IVP */}
            <button
              onClick={refreshLive}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)] disabled:opacity-60"
              disabled={dvolLoading || ivrLoading || tsLoading || skewLoadingAny || skLoading}
              title="Update DVOL + IVR + IV Term Structure from Deribit"
            >
              <Cloud className={`w-4 h-4 ${(dvolLoading || ivrLoading || tsLoading || skewLoadingAny || skLoading) ? "animate-spin" : ""}`} />
              Update
            </button>

            <button onClick={exportJSON} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)]">
              <Download className="w-4 h-4" /> JSON
            </button>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)]" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Controls */}
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-950)] px-3 py-2 shadow-[var(--shadow)]">
              <Search className="w-4 h-4 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full outline-none text-sm placeholder:text-[var(--fg-muted)] bg-transparent text-[var(--fg)]"
                placeholder="Search KPI name or id (e.g., 'iv-rv-spread')"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[var(--fg-muted)] text-sm"><Filter className="w-4 h-4" /> Filter by strategy</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STRATEGIES.map((s) => (
                <StrategyTag key={s} label={s} active={activeStrategies.includes(s)} onClick={() => toggleStrategy(s)} />
              ))}
            </div>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <section key={group.id}>
              <GroupHeader title={group.title} open={openGroups[group.id]} onToggle={() => toggleGroup(group.id)} />
              {openGroups[group.id] && (
                <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.kpis.map((kpi) => {
                    let value = samples[kpi.id];
                    let meta: string | undefined = undefined;
                    let extraBadge: string | null = null;

                    if (kpi.id === "atm-iv" && dvolPct != null) {
                      value = `${dvolPct.toFixed(1)}%`;
                      meta = "DVOL 30D (proxy)";
                    }
                    if (kpi.id === "ivr" && ivr != null) {
                      value = `${ivr}`; // keep as 0..100 (not %)
                      meta = "DVOL-based IVR";
                      if (ivp != null) extraBadge = `IVP ${ivp}`;
                    }
                    if (kpi.id === "rv" && rv20d != null) {
                      value = `${(rv20d * 100).toFixed(1)}%`;
                      meta = rvTs ? `20D RV · ${new Date(rvTs).toLocaleDateString()}` : "20D RV";
                      extraBadge = rvLoading ? "Refreshing…" : null;
                    }
                    if (kpi.id === "iv-rv-spread" && dvolPct != null && rv20d != null) {
                      const spread = dvolPct - (rv20d * 100);
                      const sign = spread >= 0 ? "+" : "";
                      value = `${sign}${spread.toFixed(1)}%`;
                      meta = "IV − RV";
                      extraBadge = `IV ${dvolPct.toFixed(1)} • RV ${(rv20d * 100).toFixed(1)}`;
                    }
                    if (kpi.id === "term-structure" && tsData) {
                      const labelTitle =
                        tsData.label === "insufficient"
                          ? "Insufficient"
                          : tsData.label[0].toUpperCase() + tsData.label.slice(1);
                    
                      const premiumPct =
                        tsData.termPremium != null ? (tsData.termPremium * 100) : null;
                      const sign = premiumPct != null && premiumPct >= 0 ? "+" : "";
                    
                      value = labelTitle + (premiumPct != null ? ` (${sign}${premiumPct.toFixed(1)}%)` : "");
                      // meta: show slope and sample window size
                      meta = tsData.slopePerYear != null
                        ? `Slope ${(tsData.slopePerYear * 100).toFixed(2)}%/yr · n=${tsData.n}`
                        : `n=${tsData.n}`;
                      // extra badge: front→back expiries
                      if (tsData.points.length >= 2) {
                        const first = tsData.points[0]?.expiryISO;
                        const last = tsData.points[tsData.points.length - 1]?.expiryISO;
                        extraBadge = `${first} → ${last}`;
                      } else {
                        extraBadge = "Awaiting data";
                      }
                    }
                    // Skew (25Δ Risk Reversal): RR = IV(25Δ Call) − IV(25Δ Put)  [vol points]
                    if (kpi.id === "skew-25d-rr") {
                      const tenors = [
                        { key: "7d",  label: "BTC 7D",  s: skew7  },
                        { key: "30d", label: "BTC 30D", s: skew30 },
                        { key: "60d", label: "BTC 60D", s: skew60 },
                      ];
                      return (
                        <>
                          {tenors.map(({ key, label, s }) => {
                            let v = samples[kpi.id];
                            let m: string | undefined = undefined;
                            let b: string | null = null;
                    
                            if (s?.skew != null) {
                              const vp = s.skew * 100; // vol points
                              const sign = vp >= 0 ? "+" : "";
                              v = `${sign}${vp.toFixed(2)}`;
                              m = s.expiryLabel ? `${label} · ${s.expiryLabel}` : label;
                              if (s.ivC25 != null && s.ivP25 != null) {
                                b = `C25 ${(s.ivC25 * 100).toFixed(1)} • P25 ${(s.ivP25 * 100).toFixed(1)}`;
                              } else {
                                b = "Interpolating…";
                              }
                            } else if (s?.loading) {
                              v = "…";
                              m = `${label} · loading`;
                              b = null;
                            } else if (s?.error) {
                              v = "—";
                              m = `${label} · error`;
                              b = null;
                            } else {
                              m = label;
                            }
                    
                            return (
                              <KpiCard
                                key={`${kpi.id}-${key}`}
                                kpi={kpi}
                                value={v}
                                meta={m}
                                extraBadge={b}
                              />
                            );
                          })}
                        </>
                      );
                    }

                    if (kpi.id === "ts-kink") {
                      let v = samples[kpi.id];
                      let m: string | undefined = undefined;
                      let b: string | null = null;

                      if (skLoading) {
                        v = "…";
                        m = "loading";
                      } else if (skError) {
                        v = "—";
                        m = "error";
                      } else if (skData && typeof skData.kinkPoints === "number") {
                        const vp = skData.kinkPoints * 100; // vol points in %
                        const sign = vp >= 0 ? "+" : "";
                        v = `${sign}${vp.toFixed(2)}%`;
                        m = `0DTE − mean(1–3DTE)${skData.indexPrice ? ` · S ${Math.round(skData.indexPrice)}` : ""}`;

                        // tiny extra badge, like IVR’s IVP badge
                        const iv0 = skData.iv0dte != null ? (skData.iv0dte * 100).toFixed(1) : "—";
                        const m13 = skData.mean1to3 != null ? (skData.mean1to3 * 100).toFixed(1) : "—";
                        const ratio = skData.kinkRatio != null ? `${skData.kinkRatio.toFixed(2)}×` : null;
                        b = ratio ? `0D ${iv0} • 1–3D ${m13} • ${ratio}` : `0D ${iv0} • 1–3D ${m13}`;
                      } else {
                        m = "Awaiting data";
                      }

                      return <KpiCard key={kpi.id} kpi={kpi} value={v} meta={m} extraBadge={b} />;
                    }

                    if (kpi.id === "rv-em-factor") {
                      const TENOR_DAYS = 20; // choose your tenor (match your RV window)
                      const { value: ratio, rvAnn, ivAnn, loading, error } = useRvEmFactor({ currency: "BTC", days: TENOR_DAYS });
                    
                      const v   = loading ? "…" : (ratio != null ? `${ratio.toFixed(2)}×` : "—");
                      const m   = loading ? "loading" : (error ? "error" : `BTC ${TENOR_DAYS}D · RV ÷ IV`);
                      const bad = (rvAnn != null && ivAnn != null) ? `IV ${(ivAnn * 100).toFixed(1)} • RV ${(rvAnn * 100).toFixed(1)}` : null;
                    
                      return <KpiCard key={kpi.id} kpi={kpi} value={v} meta={m} extraBadge={bad} />;
                    }

                    if (kpi.id === "em-ribbon") {
                      return (
                        <div key="em-ribbon" className="col-span-full">
                          <ExpectedMoveRibbonCard currency="BTC" />
                        </div>
                      );
                    }

                    return (
                      <KpiCard key={kpi.id} kpi={kpi} value={value} meta={meta} extraBadge={extraBadge} />
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          {filteredGroups.length === 0 && (
            <div className="text-center py-16 text-[var(--fg-muted)]">No KPIs match your search/filters.</div>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-[var(--fg-muted)] mt-10">
          ATM IV shows <span className="font-semibold">DVOL 30D (proxy)</span> when updated. IVR/IVP are computed from DVOL (52-week window). Samples are mock values until refreshed.
        </div>
      </main>

      {/*
        ===== Tailwind token wiring (drop into tailwind.config.{js,ts,mjs}) =====

        export default {
          theme: {
            extend: {
              colors: {
                brand: { 400: 'var(--brand-400)', 500: 'var(--brand-500)', 600: 'var(--brand-600)' },
                surface: { 950: 'var(--surface-950)', 900: 'var(--surface-900)' },
                border: 'var(--border)',
                fg: { DEFAULT: 'var(--fg)', muted: 'var(--fg-muted)' },
                bg: 'var(--bg)'
              },
              borderRadius: { lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', '2xl': 'var(--radius-2xl)' }
            }
          }
        }
      */}
    </div>
  );
}
