import * as React from "react";
import { SideSheet } from "../../components/ui/SideSheet";
import { STRATEGY_CATALOG, type StrategyKey } from "../../data/kpis";
import { useChecklistGlobalKpis } from "../../hooks/kpi/useChecklistGlobalKpis";

// Checklist VM + types
import {
  useStrategyChecklist,
  type GlobalKpiMapForChecklist,
} from "../../hooks/kpi/useStrategyChecklist";

// Trade-kit VM router (generic for all strategies)
// (path may need to be adjusted depending on where you put it)
import { useStrategyTradeKit } from "../../hooks/kpi/useStrategyTradeKit";

// UI panels
import { StrategyChecklistPanel } from "../strategy/StrategyChecklistPanel";
import { StrategyScannerPanel } from "../strategy/StrategyScannerPanel";
import { StrategySettingsPanel } from "../strategy/StrategySettingsPanel";

type StrategyOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyId: StrategyKey;
  underlying?: "BTC" | "ETH";
  expiryISO?: string;
};

type View = "checklist" | "scanner" | "settings";

export function StrategyOverlay({
  open,
  onOpenChange,
  strategyId,
  underlying = "BTC",
  expiryISO = new Date().toISOString(),
}: StrategyOverlayProps) {
  const meta = STRATEGY_CATALOG[strategyId];
  const [view, setView] = React.useState<View>("checklist");

  // Reset tab when you switch strategy
  React.useEffect(() => {
    setView("checklist");
  }, [strategyId]);

  // Checklist view-model
  const globalKpis = useChecklistGlobalKpis(strategyId);
  const tradeKit = useStrategyTradeKit(strategyId);
  const checklistModel = useStrategyChecklist(strategyId, {
    globalKpis,
    tradeKit,
  });

  // For now only Horizon has a scanner wired
  const hasScanner = strategyId === "horizon";

  const title = meta?.name ?? "Strategy";

  const handleCloseAfterSettings = () => {
    // After saving/cancelling settings, go back to checklist and close drawer
    setView("checklist");
    onOpenChange(false);
  };

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title={title}>
      {/* Header summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] p-3 text-xs">
        <div>
          <div className="uppercase tracking-wide text-[var(--muted)]">
            Strategy
          </div>
          <div className="text-[var(--fg-strong)] font-semibold">
            {meta?.name ?? strategyId}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-[var(--muted)]">
            Underlying
          </div>
          <div className="text-[var(--fg-strong)] font-semibold">
            {underlying}
          </div>
        </div>
        <div className="col-span-2">
          <div className="uppercase tracking-wide text-[var(--muted)]">
            Expiry
          </div>
          <div className="text-[var(--fg-strong)] font-mono">
            {new Date(expiryISO).toUTCString()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setView("checklist")}
          className={
            "rounded-full px-3 py-1.5 border transition-colors " +
            (view === "checklist"
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent-soft)]")
          }
        >
          Checklist
        </button>

        {hasScanner && (
          <button
            type="button"
            onClick={() => setView("scanner")}
            className={
              "rounded-full px-3 py-1.5 border transition-colors " +
              (view === "scanner"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent-soft)]")
            }
          >
            Scanner
          </button>
        )}

        <button
          type="button"
          onClick={() => setView("settings")}
          className={
            "rounded-full px-3 py-1.5 border transition-colors " +
            (view === "settings"
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent-soft)]")
          }
        >
          Settings
        </button>
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {view === "checklist" && (
          <StrategyChecklistPanel model={checklistModel} />
        )}

        {view === "scanner" && hasScanner && (
          <StrategyScannerPanel strategyId={strategyId} />
        )}

        {view === "settings" && (
          <StrategySettingsPanel
            strategyId={strategyId}
            onClose={handleCloseAfterSettings}
          />
        )}
      </div>
    </SideSheet>
  );
}

export default StrategyOverlay;