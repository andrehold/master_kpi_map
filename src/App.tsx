import { useMemo, useState, useEffect } from "react";
import { TokenStyles, TOKENS, ThemeKey } from "./theme/tokens";
import HeaderBar from "./components/ui/HeaderBar";
import ControlsBar from "./components/ui/ControlsBar";
import GroupHeader from "./components/ui/GroupHeader";
import KpiCardRenderer, { type KpiCardRendererContext } from "./components/ui/KpiCardRenderer";

import { STRATEGIES, type Strategy, KPI_GROUPS, type StrategyKey } from "./data/kpis";
import { buildSamples, type Samples } from "./utils/samples";

import { useDeribitDvol } from "./hooks/useDeribitDvol";
import { useIvrFromDvol } from "./hooks/useIvrFromDvol";
import { useIVTermStructure } from "./hooks/useIVTermStructure";
import { useDeribitSkew25D } from "./hooks/useDeribitSkew25D";
import { useTermStructureKink } from "./hooks/useTermStructureKink";
import { useRealizedVol } from "./hooks/useRealizedVol";
import { useRvEmFactor } from "./hooks/useRvEmFactor";
import { useDeribitIndexPrice } from "./hooks/useDeribitIndexPrice";
import { useDeribitFunding } from "./hooks/useDeribitFunding";
import { useDeribitBasis } from "./hooks/useDeribitBasis";
import { useCondorCreditPctOfEM } from "./hooks/useCondorCreditPctOfEM";
import { useOpenInterestConcentration } from "./hooks/useOpenInterestConcentration";
import { useExpectedMove } from "./hooks/useExpectedMove";
import { useGammaWalls } from "./hooks/useGammaWalls";

import type { ExpectedMovePoint } from "./hooks/useExpectedMove";
import type { IVPoint } from "./lib/atmIv";

// Guidance UI
import { GuidanceSwitch } from "./components/ui/Guidance";

// UI primitives + data-driven Strategies menu
import { ToastProvider } from "./components/ui/Use-toast";
import { StrategiesMenuButton } from "@/components/ui/StrategiesMenuButton";

// Generic strategy overlays
import StrategyOverlay from "./components/overlays/StrategyOverlay";
import { StrategySettings } from "./components/overlays/StrategySettings";

export default function MasterKPIMapDemo() {
  const [search, setSearch] = useState("");
  const [activeStrategies, setActiveStrategies] = useState<Strategy[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    KPI_GROUPS.forEach((g) => { init[g.id] = true; });
    return init;
  });
  const [samples, setSamples] = useState<Samples>(() => buildSamples(KPI_GROUPS));
  const [theme, setTheme] = useState<ThemeKey>("light");
  const [isUpdating, setIsUpdating] = useState(false);
  const RVEM_TENOR_DAYS = 20;
  const locale = "en";

  // Live data (BTC by default)
  const { valuePct: dvolPct, lastUpdated: dvolTs, loading: dvolLoading, error: dvolError, refresh: refreshDvol } = useDeribitDvol("BTC");
  const { ivr, ivp, lastUpdated: ivrTs, loading: ivrLoading, error: ivrError, refresh: refreshIvr } = useIvrFromDvol("BTC");

  // IV Term Structure
  const { data: tsData, loading: tsLoading, error: tsError, reload: refreshTerm } = useIVTermStructure({
    currency: "BTC",
    maxExpiries: 6,
    bandPct: 0.07,
    minDteHours: 12,
  });

  // Skew (25Δ RR)
  const skew7  = useDeribitSkew25D({ currency: "BTC", targetDays: 7  });
  const skew30 = useDeribitSkew25D({ currency: "BTC", targetDays: 30 });
  const skew60 = useDeribitSkew25D({ currency: "BTC", targetDays: 60 });
  const skewLoadingAny = !!(skew7.loading || skew30.loading || skew60.loading);
  const skewErrorAny   = skew7.error || skew30.error || skew60.error;

  const { data: skData, loading: skLoading, error: skError, refresh: refreshSK } = useTermStructureKink("BTC", { pollMs: 0 });
  const {
    value: rvemRatio,
    rvAnn,
    ivAnn,
    loading: rvemLoading,
    error: rvemError,
  } = useRvEmFactor({ currency: "BTC", days: RVEM_TENOR_DAYS });
  const { price: indexPrice, lastUpdated: indexTs, loading: indexLoading, error: indexError } = useDeribitIndexPrice("BTC", 15000);
  const {
    basisPct: basisPctPerp,
    basisAbs: basisAbsPerp,
    annualizedPct: basisAnnPerp,
    lastUpdated: basisTs,
    loading: basisLoading,
    error: basisError,
    refresh: refreshBasis,
  } = useDeribitBasis("BTC", "BTC-PERPETUAL", 15000);

  // RV 20D (BTC)
  const { rv: rv20d, lastUpdated: rvTs, loading: rvLoading, error: rvError, refresh: refreshRV } =
    useRealizedVol({ currency: "BTC", windowDays: 20, resolutionSec: 86400, annualizationDays: 365 });

  // Funding (BTC perpetual)
  const { current8h, avg7d8h, zScore, updatedAt: fundingTs, loading: fundingLoading, error: fundingError, refresh: refreshFunding } =
    useDeribitFunding("BTC-PERPETUAL");

  const gammaWalls = useGammaWalls({
    currency: "BTC",
    windowPct: 0.10,
    topN: 5,     // so gw.top has 5 entries for the mini table
    pollMs: 0,   // no polling, same as before
  });

  const {
    data: condorData,
    loading: condorLoading,
    error: condorError,
  } = useCondorCreditPctOfEM({
    currency: "BTC",
    pollMs: 0, // 30DTE is baked into the hook via TARGET_DTE_DAYS = 30
  });

  const oiConcentrationState = useOpenInterestConcentration({
    currency: "BTC",
    topN: 3,
    expiry: "all",
    windowPct: 0.25,
    pollMs: 0,
  });

  const expectedMoveState = useExpectedMove({
    currency: "BTC",
    horizons: EXPECTED_MOVE_TENORS,
  });
  const expectedMoveRows = useMemo(
    () => buildExpectedMoveRows(expectedMoveState.em, expectedMoveState.points),
    [expectedMoveState.em, expectedMoveState.points]
  );

  // Generic overlay/settings state
  const [overlayStrategy, setOverlayStrategy] = useState<StrategyKey | null>(null);
  const [settingsStrategy, setSettingsStrategy] = useState<StrategyKey | null>(null);
  const defaultUnderlying = "BTC" as const;
  const defaultExpiryISO = new Date(Date.now() + 7*24*3600*1000).toISOString();

  useEffect(() => { setSamples(buildSamples(KPI_GROUPS)); }, []);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return KPI_GROUPS.map((group) => {
      const kpis = group.kpis.filter((k) => {
        const matchesText = !q || k.name.toLowerCase().includes(q) || k.id.toLowerCase().includes(q);
        const matchesStrategy = activeStrategies.length === 0 || activeStrategies.some((s) => (k.strategies ?? []).includes(s));
        return matchesText && matchesStrategy;
      });
      return { ...group, kpis };
    }).filter((g) => g.kpis.length > 0);
  }, [search, activeStrategies]);

  const totalKpis = KPI_GROUPS.reduce((acc, g) => acc + g.kpis.length, 0);
  const visibleKpis = filteredGroups.reduce((acc, g) => acc + g.kpis.length, 0);

  function toggleStrategy(s: Strategy) {
    setActiveStrategies((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }
  function toggleGroup(id: string) { setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] })); }
  function regenerate() { setSamples(buildSamples(KPI_GROUPS)); }

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
    try {
      try { await refreshDvol(); } catch {}
      await new Promise(r => setTimeout(r, 120));
      try { await refreshIvr(); } catch {}
      await new Promise(r => setTimeout(r, 120));
      try { await refreshRV(); } catch {}
      await new Promise(r => setTimeout(r, 120));
      try { await refreshFunding(); } catch {}
      try { await refreshBasis(); } catch {}
      await new Promise(r => setTimeout(r, 120));

      await new Promise(r => setTimeout(r, 150));
      try { await refreshTerm(); } catch {}
      await new Promise(r => setTimeout(r, 150));
      try { refreshSK(); } catch {}

      await new Promise(r => setTimeout(r, 150));
      skew7.refresh?.(); await new Promise(r => setTimeout(r, 150));
      skew30.refresh?.(); await new Promise(r => setTimeout(r, 150));
      skew60.refresh?.();
      await new Promise(r => setTimeout(r, 150));
      try { await expectedMoveState.reload(); } catch {}
    } finally {
      setIsUpdating(false);
    }
  }

  const errorText =
    (dvolError || ivrError || tsError || skewErrorAny || skError || rvError || indexError || fundingError || expectedMoveState.error) || null;

  const loadingAny = dvolLoading || ivrLoading || tsLoading || skewLoadingAny || skLoading || fundingLoading || expectedMoveState.loading;

  const kpiCardContext: KpiCardRendererContext = {
    samples,
    locale,
    dvolPct,
    ivr,
    ivp,
    rv: {
      value: rv20d,
      ts: rvTs ?? null,
      loading: rvLoading,
    },
    termStructure: tsData,
    skew: {
      entries: [
        { key: "7d", label: "BTC 7D", state: skew7 },
        { key: "30d", label: "BTC 30D", state: skew30 },
        { key: "60d", label: "BTC 60D", state: skew60 },
      ],
      kink: {
        loading: skLoading,
        error: skError ?? null,
        data: skData,
      },
    },
    rvem: {
      ratio: rvemRatio ?? null,
      rvAnn,
      ivAnn,
      loading: rvemLoading,
      error: rvemError ?? null,
      tenorDays: RVEM_TENOR_DAYS,
    },
    funding: {
      loading: fundingLoading,
      error: fundingError ?? null,
      current8h,
      avg7d8h,
      ts: fundingTs ?? null,
    },
    expectedMove: {
      loading: expectedMoveState.loading,
      error: expectedMoveState.error ?? null,
      asOf: expectedMoveState.asOf,
      rows: expectedMoveRows,
    },
    condor: {
      data: condorData,
      loading: condorLoading,
      error: condorError ?? null,
    },
    basis: {
      loading: basisLoading,
      error: basisError ?? null,
      pct: basisPctPerp,
      abs: basisAbsPerp ?? null,
      ts: basisTs ?? null,
    },
    oiConcentration: oiConcentrationState,
    gammaWalls: gammaWalls,
  };

  return (
    <ToastProvider>
      <div data-theme="tm" style={{ colorScheme: TOKENS[theme].colorScheme as any }} className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        <TokenStyles theme={theme} />

        {/* Header */}
        <HeaderBar
          theme={theme}
          setTheme={setTheme}
          visibleKpis={visibleKpis}
          totalKpis={totalKpis}
          groupsCount={filteredGroups.length}
          indexPrice={indexPrice}
          indexTs={indexTs ?? undefined}
          errorText={typeof errorText === "string" ? errorText : null}
          onRegenerate={regenerate}
          onRefreshLive={refreshLive}
          onExportJSON={exportJSON}
          loadingAny={!!loadingAny}
        />

        {/* Fixed Strategies utility (top-right), non-intrusive */}
        <div className="fixed top-3 right-4 z-40">
          <StrategiesMenuButton
            label="Strategies"
            onOpenOverlay={(id) => setOverlayStrategy(id)}
            onOpenSettings={(id) => setSettingsStrategy(id)}
          />
        </div>

        <main className="mx-auto max-w-7xl px-4 py-6">
          <ControlsBar
            search={search}
            setSearch={setSearch}
            activeStrategies={activeStrategies}
            toggleStrategy={toggleStrategy}
          />

          {/* Global guidance mini-bar toggle */}
          <div className="flex justify-end mb-2">
            <GuidanceSwitch />
          </div>

          <div className="space-y-4">
            {filteredGroups.map((group) => (
              <section key={group.id}>
                <GroupHeader title={group.title} open={openGroups[group.id]} onToggle={() => toggleGroup(group.id)} />
                {openGroups[group.id] && (
                  <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.kpis.map((kpi) => (
                      <KpiCardRenderer key={kpi.id} kpi={kpi} context={kpiCardContext} />
                    ))}
                  </div>
                )}
              </section>
            ))}
            {filteredGroups.length === 0 && (
              <div className="text-center py-16 text-[var(--fg-muted)]">No KPIs match your search/filters.</div>
            )}
          </div>

          <div className="text-xs text-[var(--fg-muted)] mt-10">
            ATM IV shows <span className="font-semibold">DVOL 30D (proxy)</span> when updated. IVR/IVP are computed from DVOL (52-week window). Samples are mock values until refreshed.
          </div>
        </main>

        {/* Generic strategy overlays */}
        <StrategyOverlay
          open={!!overlayStrategy}
          onOpenChange={(v) => { if (!v) setOverlayStrategy(null); }}
          strategyId={overlayStrategy ?? "horizon"}
          underlying={defaultUnderlying}
          expiryISO={defaultExpiryISO}
        />
        <StrategySettings
          open={!!settingsStrategy}
          onOpenChange={(v) => { if (!v) setSettingsStrategy(null); }}
          strategyId={settingsStrategy ?? "horizon"}
        />
      </div>
    </ToastProvider>
  );
}

type ExpectedMoveRow = {
  days: number;
  expiryTs: number | null;
  abs: number | null;
  pct: number | null;
};

const EXPECTED_MOVE_TENORS: number[] = [1, 7, 30, 90];

function buildExpectedMoveRows(emPoints?: ExpectedMovePoint[], ivPoints?: IVPoint[]): ExpectedMoveRow[] {
  if (!emPoints?.length) return [];
  const points = [...(ivPoints ?? [])].sort((a, b) => a.dteDays - b.dteDays);
  return emPoints.map((row) => ({
    days: row.days,
    expiryTs: nearestExpiryTs(points, row.days),
    abs: row.abs ?? null,
    pct: row.pct ?? null,
  }));
}

function nearestExpiryTs(points: IVPoint[], days: number): number | null {
  if (!points.length) return null;
  let bestIndex = 0;
  let bestDiff = Math.abs(points[0].dteDays - days);
  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].dteDays - days);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }
  return points[bestIndex]?.expiryTs ?? null;
}
