import { useCallback, useMemo, useState } from "react";
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
import { DbBrowser } from "./components/DbBrowser";

import { useRunId } from "./hooks/app/useRunId";
import { useKpiDashboardContext } from "./hooks/app/useKpiDashboardContext";

// ✅ import the shared types (don’t redefine them locally)
import type {
  KpiCardRendererContext,
  KpiSnapshotPayload,
} from "./components/ui/kpiCards/types";

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
  const [theme, setTheme] = useState<ThemeKey>("dark");
  const [showConfig, setShowConfig] = useState(false);
  const [showDb, setShowDb] = useState(false);

  const {
    context: kpiCardContext,
    indexPrice,
    indexTs,
    errorText,
    loadingAny,
    refreshLive,
  } = useKpiDashboardContext({ currency, runId, samples, locale });

  // Cards/hooks can call context.snapshotSink?.({ kpiId, seriesKey, valueText, ... })
  const snapshotSink = useCallback(async (snap: KpiSnapshotPayload) => {
    if (!runId) return;

    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          ts: snap.ts ?? Date.now(),
          ...snap,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[persist] /api/snapshots failed:", res.status, text);
      }
    } catch (e) {
      console.warn("[persist] /api/snapshots error:", e);
    }
  }, [runId]);

  const context: KpiCardRendererContext = useMemo(
    () => ({
      ...kpiCardContext,
      runId,
      snapshotSink,
    }),
    [kpiCardContext, runId, snapshotSink]
  );

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

  async function exportJSON() {
    try {
      // Prefer the active runId (matches the data you persist during Update)
      const url = runId
        ? `/api/runs/${encodeURIComponent(runId)}/export.json`
        : `/api/runs/latest/export.json`;

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[exportJSON] failed:", res.status, text);
        return;
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `kpis_${runId ?? "latest"}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.warn("[exportJSON] error:", e);
    }
  }

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
          onOpenDb={() => setShowDb(true)}
        />

        <KpiConfigOverlay open={showConfig} onClose={() => setShowConfig(false)} />

        {/* DB Browser Overlay */}
        {showDb ? (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="absolute inset-x-0 top-16 mx-auto max-w-6xl px-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-950)] shadow-[var(--shadow)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                  <div className="text-sm font-semibold">Snapshot DB</div>
                  <button
                    onClick={() => setShowDb(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-sm shadow-[var(--shadow)]"
                  >
                    Close
                  </button>
                </div>
                <DbBrowser />
              </div>
            </div>
          </div>
        ) : null}

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
              <KpiCardRenderer kpi={makeKpiDef(kpiId)} context={context} />
            )}
          />

          <div className="text-xs text-[var(--fg-muted)] mt-10">
            ATM IV shows <span className="font-semibold">DVOL 30D (proxy)</span> when
            updated. IVR/IVP are computed from DVOL (52-week window). Samples are
            mock values until refreshed.
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
