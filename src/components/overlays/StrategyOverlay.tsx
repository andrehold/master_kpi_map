import * as React from "react";
import { SideSheet } from "@/components/ui/SideSheet";
import { Button } from "../ui/Button";
import { STRATEGY_CATALOG, type StrategyKey } from "@/data/kpis";

// Horizon scan & CSV (others can be added later)
import {
  scanHorizonBTCUSD,
  horizonRowsToCSV,
  downloadCSV,
  type HorizonRow,
} from "@/services/horizonScan";

type OverlayProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  strategyId: StrategyKey;
  underlying?: "BTC" | "ETH";
  expiryISO?: string;
};

// --- registry of overlay implementations per strategy ---
type OverlayImpl = {
  title: string;
  scan: () => Promise<any[]>;
  toCSV?: (rows: any[]) => string;
  download?: (csv: string) => void;
  renderRows: (rows: any[]) => React.ReactNode;
};

const OVERLAYS: Partial<Record<StrategyKey, OverlayImpl>> = {
  horizon: {
    title: "Horizon — EM-based Entry",
    scan: async () => scanHorizonBTCUSD(),
    toCSV: horizonRowsToCSV as (rows: any[]) => string,
    download: downloadCSV,
    renderRows: (rows: HorizonRow[]) => (
      <div className="text-sm">
        {rows.map((r, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] p-3 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Iron Condor (EM×1.0 / EM×1.6)</div>
              <div>Credit: <b>${r.credit_mid_usd.toFixed(2)}</b></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>Short Put K: <b>{r.short_put_K.toFixed(0)}</b></div>
              <div>Long  Put K: <b>{r.long_put_K.toFixed(0)}</b></div>
              <div>Short Call K: <b>{r.short_call_K.toFixed(0)}</b></div>
              <div>Long  Call K: <b>{r.long_call_K.toFixed(0)}</b></div>
            </div>
            <div className="text-xs opacity-80">
              SP: {r.sp_name} · LP: {r.lp_name} · SC: {r.sc_name} · LC: {r.lc_name}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>Max Loss: <b>${r.max_loss_usd.toFixed(2)}</b></div>
              <div>EM: <b>${r.EM_usd.toFixed(2)}</b> ({(r.EM_pct * 100).toFixed(1)}%)</div>
              <div>Passes: <b>{r.passes ? "Yes" : "No"}</b></div>
            </div>
            <div className="text-xs opacity-80">
              Liquidity check: {r.liquidity_ok ? "OK" : "Too wide"} · DTE: {r.dte} · Spot: ${r.spot_usd.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  // carry: { ... }  // add later
  // odte:  { ... }
};

export default function StrategyOverlay({
  open,
  onOpenChange,
  strategyId,
  underlying = "BTC",
  expiryISO = new Date().toISOString(),
}: OverlayProps) {
  const impl = OVERLAYS[strategyId];
  const meta = STRATEGY_CATALOG[strategyId];
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);

  async function run() {
    if (!impl?.scan) return;
    setBusy(true);
    try {
      const r = await impl.scan();
      setRows(r ?? []);
    } finally {
      setBusy(false);
    }
  }

  const title = impl?.title ?? meta?.name ?? "Strategy";
  const canDownload = !!(impl?.toCSV && impl?.download && rows?.length);

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="text-sm grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] p-3 mb-4">
        <div>Strategy: <b>{meta?.name ?? strategyId}</b></div>
        <div>Underlying: <b>{underlying}</b></div>
        <div className="col-span-2">Expiry: <b>{new Date(expiryISO).toUTCString()}</b></div>
      </div>

      <div className="flex gap-2 mb-3">
        <Button onClick={run} disabled={busy || !impl?.scan}>
          {busy ? "Scanning…" : "Scan now"}
        </Button>
        <Button
          variant="outline"
          disabled={!canDownload}
          onClick={() => {
            if (!impl?.toCSV || !impl?.download || !rows?.length) return;
            impl.download(impl.toCSV(rows));
          }}
        >
          Download CSV
        </Button>
      </div>

      {!rows?.length && (
        <div className="text-sm text-[var(--fg-muted)]">
          {impl?.scan ? "No results yet. Click “Scan now”." : "This strategy has no scanner yet."}
        </div>
      )}

      {rows?.length > 0 && impl?.renderRows ? impl.renderRows(rows) : null}
    </SideSheet>
  );
}
