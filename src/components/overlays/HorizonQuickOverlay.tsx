import * as React from "react";
import { SideSheet } from "@/components/ui/SideSheet";
import { Button } from "../ui/Button";
import { scanHorizonBTCUSD, horizonRowsToCSV, downloadCSV } from "@/services/horizonScan";
import type { Underlying } from "../../services/horizonScan";

export default function HorizonQuickOverlay({
  open,
  onOpenChange,
  underlying,
  expiryISO,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  underlying: Underlying;
  expiryISO: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<ReturnType<typeof Array> & any>([]);

  async function run() {
    setBusy(true);
    try {
      const r = await scanHorizonBTCUSD();
      setRows(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title="Horizon — EM-based Entry">
      <div className="text-sm grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] p-3 mb-4">
        <div>Underlying: <b>{underlying}</b></div>
        <div>Expiry: <b>{new Date(expiryISO).toUTCString()}</b></div>
      </div>

      <div className="flex gap-2 mb-3">
        <Button onClick={run} disabled={busy}>{busy ? "Scanning…" : "Scan now"}</Button>
        <Button
          variant="outline"
          onClick={() => { if (!rows?.length) return; downloadCSV(horizonRowsToCSV(rows)); }}
          disabled={!rows?.length}
        >
          Download CSV
        </Button>
      </div>

      {!rows?.length && <div className="text-sm text-[var(--fg-muted)]">No results yet. Click “Scan now”.</div>}

      {rows?.length > 0 && (
        <div className="text-sm">
          {rows.map((r: any, i: number) => (
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
                <div>EM: <b>${r.EM_usd.toFixed(2)}</b> ({(r.EM_pct*100).toFixed(1)}%)</div>
                <div>Passes: <b>{r.passes ? "Yes" : "No"}</b></div>
              </div>
              <div className="text-xs opacity-80">
                Liquidity check: {r.liquidity_ok ? "OK" : "Too wide"} · DTE: {r.dte} · Spot: ${r.spot_usd.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </SideSheet>
  );
}
