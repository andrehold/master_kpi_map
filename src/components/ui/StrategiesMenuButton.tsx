import * as React from "react";
import { Button } from "./Button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./Dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./Tooltip";
import { useToast } from "./Use-toast";

import { ListChecks, ChevronLeft, Download, PanelRightOpen, Cog, Loader2 } from "lucide-react";
import { STRATEGY_CATALOG, type StrategyKey } from "@/data/kpis";

// Horizon scan (others can be added in the map below)
import { runHorizonScanAndDownload } from "@/services/horizonScan";

type Props = {
  label?: string; // default "Strategies"
  // Back-compat (you can also handle generically via onOpenOverlay/onOpenSettings):
  onHorizonOpenOverlay?: () => void;
  onHorizonOpenSettings?: () => void;

  // Generic hooks if you want to route overlays/settings by id later:
  onOpenOverlay?: (id: StrategyKey) => void;
  onOpenSettings?: (id: StrategyKey) => void;
};

// Map catalog action keys → actual functions
const SCAN_EXECUTORS: Record<string, () => Promise<void>> = {
  horizonScan: async () => { 
    await runHorizonScanAndDownload(); // ignore returned rows
  },
  // add more when you implement other scanners:
  // carryScan: async () => ...
};

export const StrategiesMenuButton: React.FC<Props> = ({
  label = "Strategies",
  onHorizonOpenOverlay,
  onHorizonOpenSettings,
  onOpenOverlay,
  onOpenSettings,
}) => {
  const { toast } = useToast();
  const [active, setActive] = React.useState<StrategyKey | null>(null);
  const [busy, setBusy] = React.useState<StrategyKey | null>(null);

  // Build root list from catalog (you can sort here if you want a custom order)
  const ROOT_STRATS = React.useMemo(
    () =>
      Object.values(STRATEGY_CATALOG).map((s) => ({
        id: s.id,
        name: s.short ? `${s.name} (${s.short})` : s.name,
        hasActions: !!s.actions,
      })),
    []
  );

  async function runScanFor(id: StrategyKey) {
    const meta = STRATEGY_CATALOG[id];
    const key = meta.actions?.scanKey;
    if (!key) {
      toast({ title: meta.name, description: "Scan not wired yet", variant: "default" });
      return;
    }
    const exec = SCAN_EXECUTORS[key];
    if (!exec) {
      toast({ title: meta.name, description: `Missing scan executor: ${key}`, variant: "destructive" });
      return;
    }
    setBusy(id);
    try {
      await exec();
      toast({
        title: `${meta.name} — CSV exported`,
        description: "Download started",
      });
    } catch (e: any) {
      toast({
        title: `${meta.name} — scan failed`,
        description: String(e?.message ?? e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  function openOverlayFor(id: StrategyKey) {
    const meta = STRATEGY_CATALOG[id];
    if (!meta.actions?.overlayKey) {
      toast({ title: meta.name, description: "Overlay not wired yet", variant: "default" });
      return;
    }
    // Back-compat for Horizon
    if (id === "horizon" && onHorizonOpenOverlay) return onHorizonOpenOverlay();
    onOpenOverlay?.(id);
  }

  function openSettingsFor(id: StrategyKey) {
    const meta = STRATEGY_CATALOG[id];
    if (!meta.actions?.settingsKey) {
      toast({ title: meta.name, description: "Settings not available", variant: "default" });
      return;
    }
    // Back-compat for Horizon
    if (id === "horizon" && onHorizonOpenSettings) return onHorizonOpenSettings();
    onOpenSettings?.(id);
  }

  const isRootView = active == null;

  return (
    <TooltipProvider delay={250}>
      <DropdownMenu onOpenChange={(open) => { if (!open) setActive(null); }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger>
              <Button size="sm" variant="outline" className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
                <span className="hidden md:inline">{label}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Strategy utilities</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-64">
          {isRootView ? (
            // ROOT: show all strategies from catalog
            <div className="py-1">
              {ROOT_STRATS.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => {
                    if (s.hasActions) setActive(s.id as StrategyKey);
                    else toast({ title: s.name, description: "Coming soon", variant: "default" });
                  }}
                  keepOpen={s.hasActions} // keep open to show submenu
                >
                  {s.name}
                </DropdownMenuItem>
              ))}
            </div>
          ) : (
            // SUBMENU: build from the selected strategy's actions
            (() => {
              const meta = STRATEGY_CATALOG[active!];
              const scanLabel = meta.actions?.scanLabel ?? "Scan";
              const overlayLabel = meta.actions?.overlayLabel ?? "Open Overlay";

              return (
                <div className="py-1">
                  <DropdownMenuItem onClick={() => setActive(null)} keepOpen>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    <span>Back to strategies</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {/* Scan (if configured) */}
                  {meta.actions?.scanKey && (
                    <DropdownMenuItem onClick={() => runScanFor(active!)} disabled={busy === active!}>
                      <Download className="mr-2 h-4 w-4" />
                      <span>{scanLabel}</span>
                    </DropdownMenuItem>
                  )}

                  {/* Overlay (if configured) */}
                  {meta.actions?.overlayKey && (
                    <DropdownMenuItem onClick={() => openOverlayFor(active!)}>
                      <PanelRightOpen className="mr-2 h-4 w-4" />
                      <span>{overlayLabel}</span>
                    </DropdownMenuItem>
                  )}

                  {/* Settings (if configured) */}
                  {meta.actions?.settingsKey && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openSettingsFor(active!)}>
                        <Cog className="mr-2 h-4 w-4" />
                        <span>Settings…</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </div>
              );
            })()
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};
