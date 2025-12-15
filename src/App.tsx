import { useMemo, useState } from "react";
import { TokenStyles, TOKENS, ThemeKey } from "./theme/tokens";
import HeaderBar from "./components/ui/HeaderBar";
import ControlsBar from "./components/ui/ControlsBar";
import KpiCardRenderer from "./components/ui/KpiCardRenderer";
import { KpiGroupsGrid } from "./components/ui/KpiGroupsGrid";

import {
  STRATEGIES,
  type Strategy,
  KPI_GROUPS,
  type StrategyKey,
  makeKpiDef,
  getKpiTitle,
  getKpiStrategies,
} from "./data/kpis";
import { buildSamples, type Samples } from "./utils/samples";

import { GuidanceSwitch } from "./components/ui/Guidance";
import { ToastProvider } from "./components/ui/Use-toast";
import { StrategiesMenuButton } from "./components/ui/StrategiesMenuButton";
import StrategyOverlay from "./components/overlays/StrategyOverlay";
import { StrategySettings } from "./components/overlays/StrategySettings";
import { KpiConfigOverlay } from "./components/config/KpiConfigOverlay";

import { useRunId } from "./hooks/app/useRunId";
import { useKpiDashboardContext } from "./hooks/app/useKpiDashboardContext";

export default function MasterKPIMapDemo() {
  const currency = "BTC" as const;
  const locale = "en";

  const runId = useRunId(currency);

  const [search, setSearch] = useState("");
  const [activeStrategies, setActiveStrategies] = useState<Strategy[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(KPI_GROUPS.map((g) => [g.id, true]))
  );
  const [samples, setSamples] = useState<Samples>(() => buildSamples(KPI_GROUPS));
  const [theme, setTheme] = useState<ThemeKey>("light");
  const [showConfig, setShowConfig] = useState(false);

  const { context: kpiCardContext, indexPrice, indexTs, errorText, loadingAny, refreshLive } =
    useKpiDashboardContext({ currency, runId, samples, locale });

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();

    return KPI_GROUPS.map((group) => {
      const kpis = group.kpis.filter((kpiId) => {
        const title = getKpiTitle(kpiId).toLowerCase();
        const strategies = getKpiStrategies(kpiId);

        const matchesText =
          !q || title.includes(q) || String(kpiId).toLowerCase().includes(q);

        const matchesStrategy =
          activeStrategies.length === 0 ||
          activeStrategies.some((s) => strategies.includes(s));

        return matchesText && matchesStrategy;
      });

      return { ...group, kpis };
    }).filter((g) => g.kpis.length > 0);
  }, [search, activeStrategies]);

  const totalKpis = KPI_GROUPS.reduce((acc, g) => acc + g.kpis.length, 0);
  const visibleKpis = filteredGroups.reduce((acc, g) => acc + g.kpis.length, 0);

  function toggleStrategy(s: Strategy) {
    setActiveStrategies((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }
  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function regenerate() {
    setSamples(buildSamples(KPI_GROUPS));
  }
  function exportJSON() {
    const payload = {
      generated_at: new Date().toISOString(),
      strategies: STRATEGIES,
      groups: KPI_GROUPS.map((g) => ({
        id: g.id,
        title: g.title,
        kpis: g.kpis.map((kpiId) => {
          const def = makeKpiDef(kpiId);
          return { id: def.id, name: def.name, strategies: def.strategies, value: samples[def.id] };
        }),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `master-kpi-map-sample-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // overlays/settings
  const [overlayStrategy, setOverlayStrategy] = useState<StrategyKey | null>(null);
  const [settingsStrategy, setSettingsStrategy] = useState<StrategyKey | null>(null);
  const defaultUnderlying = currency;
  const defaultExpiryISO = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  return (
    <ToastProvider>
      <div
        data-theme="tm"
        style={{ colorScheme: TOKENS[theme].colorScheme as any }}
        className="min-h-screen bg-[var(--bg)] text-[var(--fg)]"
      >
        <TokenStyles theme={theme} />

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
          onOpenConfig={() => setShowConfig(true)}
        />

        <KpiConfigOverlay open={showConfig} onClose={() => setShowConfig(false)} />

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

          <div className="flex justify-end mb-2">
            <GuidanceSwitch />
          </div>

          <KpiGroupsGrid
            groups={filteredGroups}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
            renderKpi={(kpiId) => (
              <KpiCardRenderer kpi={makeKpiDef(kpiId)} context={kpiCardContext} />
            )}
          />

          <div className="text-xs text-[var(--fg-muted)] mt-10">
            ATM IV shows <span className="font-semibold">DVOL 30D (proxy)</span> when updated.
            IVR/IVP are computed from DVOL (52-week window). Samples are mock values until refreshed.
          </div>
        </main>

        <StrategyOverlay
          open={!!overlayStrategy}
          onOpenChange={(v) => !v && setOverlayStrategy(null)}
          strategyId={overlayStrategy ?? "horizon"}
          underlying={defaultUnderlying}
          expiryISO={defaultExpiryISO}
        />
        <StrategySettings
          open={!!settingsStrategy}
          onOpenChange={(v) => !v && setSettingsStrategy(null)}
          strategyId={settingsStrategy ?? "horizon"}
        />
      </div>
    </ToastProvider>
  );
}
