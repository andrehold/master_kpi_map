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

// if you already use lucide-react, keep these icons.
// otherwise you can swap for text or small inline SVGs.
import { ListChecks, ChevronLeft, Download, PanelRightOpen, Cog, Loader2 } from "lucide-react";

import { runHorizonScanAndDownload } from "@/services/horizonScan";

type Props = {
  label?: string; // default "Strategies"
  onHorizonOpenOverlay?: () => void;
  onHorizonOpenSettings?: () => void;
  // future strategies can add their own callbacks here
};

type StrategyId = "horizon" | "carry" | "odte" | "range" | "parity";

export const StrategiesMenuButton: React.FC<Props> = ({
  label = "Strategies",
  onHorizonOpenOverlay,
  onHorizonOpenSettings,
}) => {
  const { toast } = useToast();
  const [active, setActive] = React.useState<StrategyId | null>(null);
  const [busy, setBusy] = React.useState<null | StrategyId>(null);

  // simple placeholder for non-implemented strategies
  const notImplemented = (name: string) =>
    toast({ title: `${name}`, description: "Coming soon", variant: "default" });

  // top-level list of strategies shown in the first view
  const STRATS: Array<{ id: StrategyId; name: string; onOpen?: () => void }> = [
    { id: "horizon", name: "Horizon (EM Iron Condor)" },
    { id: "carry",   name: "Carry Trade", onOpen: () => notImplemented("Carry Trade") },
    { id: "odte",    name: "0DTE Overwrite", onOpen: () => notImplemented("0DTE Overwrite") },
    { id: "range",   name: "Range-Bound Premium", onOpen: () => notImplemented("Range-Bound Premium") },
    { id: "parity",  name: "Parity Edge", onOpen: () => notImplemented("Parity Edge") },
  ];

  async function horizonScan() {
    try {
      setBusy("horizon");
      await runHorizonScanAndDownload();
      toast({ title: "Horizon CSV exported", description: "Saved as horizon_candidates_btc.csv" });
    } catch (e: any) {
      toast({ title: "Horizon scan failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  // render: either strategy list, or actions for the active strategy
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
            // root: list strategies
            <div className="py-1">
              {STRATS.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => {
                    if (s.id === "horizon") setActive("horizon");
                    else s.onOpen?.();
                  }}
                  keepOpen={s.id === "horizon"} // keep menu open to show Horizon submenu
                >
                  {s.name}
                </DropdownMenuItem>
              ))}
            </div>
          ) : active === "horizon" ? (
            // horizon actions view
            <div className="py-1">
              <DropdownMenuItem onClick={() => setActive(null)} keepOpen>
                <ChevronLeft className="mr-2 h-4 w-4" />
                <span>Back to strategies</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={horizonScan} disabled={busy === "horizon"}>
                <Download className="mr-2 h-4 w-4" />
                <span>Scan & Download CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onHorizonOpenOverlay}>
                <PanelRightOpen className="mr-2 h-4 w-4" />
                <span>Open Horizon Overlay</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onHorizonOpenSettings}>
                <Cog className="mr-2 h-4 w-4" />
                <span>Settings…</span>
              </DropdownMenuItem>
            </div>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};
