import * as React from "react";
import { LineChart, Download, PanelRightOpen, Cog, Loader2 } from "lucide-react";
import { Button } from "./Button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./Dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./Tooltip";
import { runHorizonScanAndDownload } from "@/services/horizonScan"; // uses your deribit.ts under the hood
import { useToast } from "./Use-toast";

type Props = {
  onOpenOverlay?: () => void;     // call to open the Horizon overlay
  onOpenSettings?: () => void;    // optional: open a settings sheet
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "ghost";
};

export const HorizonMenuButton: React.FC<Props> = ({
  onOpenOverlay,
  onOpenSettings,
  size = "sm",
  variant = "outline",
}) => {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function handleScan() {
    try {
      setBusy(true);
      await runHorizonScanAndDownload();
      toast({ title: "Horizon CSV exported", description: "Saved as horizon_candidates_btc.csv" });
    } catch (e: any) {
      toast({ title: "Horizon scan failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const Btn = (
    <Button size={size} variant={variant} className="gap-2">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LineChart className="h-4 w-4" />}
      <span className="hidden md:inline">Horizon</span>
    </Button>
  );

  return (
    <TooltipProvider delay={250}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger>{Btn}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">EM-based entry scanner</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleScan} disabled={busy}>
            <Download className="mr-2 h-4 w-4" />
            <span>Scan & Download CSV</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenOverlay}>
            <PanelRightOpen className="mr-2 h-4 w-4" />
            <span>Open Horizon Overlay</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <Cog className="mr-2 h-4 w-4" />
            <span>Settings…</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};
