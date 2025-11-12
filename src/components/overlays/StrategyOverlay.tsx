// src/components/ui/StrategyOverlay.tsx (updated)
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

// Weekend Vol hook
import { useWeekendVol } from "@/hooks/useWeekendVol";

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

  // Scanner-style overlays (Horizon)
  scan?: () => Promise<any[]>;
  toCSV?: (rows: any[]) => string;
  download?: (csv: string) => void;
  renderRows?: (rows: any[]) => React.ReactNode;

  // NEW: static overlays that render live content (no scanner needed)
  render?: (ctx: { underlying: "BTC" | "ETH"; expiryISO: string }) => React.ReactNode;
};

// Small helper UI for Weekend Vol
function pct(x: number | null, d = 1) {
  return typeof x === "number" ? `${(x * 100).toFixed(d)}%` : "—";
}
function num(x: number | null, d = 2) {
  return typeof x === "number" ? x.toFixed(d) : "—";
}

function WeekendVolPane({ currency }: { currency: "BTC" | "ETH" }) {
  const s = useWeekendVol(currency);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm uppercase tracking-wide text-[var(--muted)]">Readiness</div>
        <div
          className={
            "px-3 py-1 rounded-lg text-sm font-semibold " +
            (s.signal === "GO"
              ? "bg-emerald-600/20 text-emerald-400"
              : s.signal === "NO-GO"
              ? "bg-rose-600/20 text-rose-400"
              : "bg-[var(--surface-800)] text-[var(--fg-muted)]")
          }
        >
          {s.loading ? "Loading…" : s.signal ?? "—"}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="opacity-70">Sun ATM IV</div>
          <div className="text-lg font-semibold">{pct(s.sunAtmIv)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="opacity-70">1w ATM IV</div>
          <div className="text-lg font-semibold">{pct(s.oneWAtmIv)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="opacity-70">Funding (8h)</div>
          <div className="text-lg font-semibold">{pct(s.funding8h, 3)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="opacity-70">Basis (perp–index)</div>
          <div className="text-lg font-semibold">{pct(s.basisPct, 2)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="opacity-70">Perp Mark</div>
          <div className="text-lg font-semibold">{num(s.perpMark)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="opacity-70">Index</div>
          <div className="text-lg font-semibold">{num(s.indexPrice)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] p-3 text-sm">
        <div className="opacity-70 mb-1">Rule</div>
        <div>
          GO if <b>Sun IV ≤ 1w IV × 1.05</b> and <b>|funding| ≤ 0.15% per 8h</b>.
          {typeof s.reasons.sunVs1wRatio === "number" && (
            <> (Sun/1w = {(s.reasons.sunVs1wRatio * 100).toFixed(1)}%)</>
          )}
        </div>
        {s.skew7d?.rr25 != null && (
          <div className="opacity-80 mt-2">
            7D 25Δ RR: <b>{pct(s.skew7d.rr25, 1)}</b>
            {s.skew7d.ivC25 != null && s.skew7d.ivP25 != null && (
              <> (C25 {pct(s.skew7d.ivC25, 1)} / P25 {pct(s.skew7d.ivP25, 1)})</>
            )}
          </div>
        )}
      </div>

      {(s.meta.sunExpiry || s.meta.oneWExpiry) && (
        <div className="text-xs text-[var(--muted)]">
          {s.meta.sunExpiry && <>Sun expiry: {new Date(s.meta.sunExpiry).toUTCString()}</>}
          {s.meta.sunExpiry && s.meta.oneWExpiry && " · "}
          {s.meta.oneWExpiry && <>1w expiry: {new Date(s.meta.oneWExpiry).toUTCString()}</>}
        </div>
      )}
    </div>
  );
}

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
              <div>
                Credit: <b>${r.credit_mid_usd.toFixed(2)}</b>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                Short Put K: <b>{r.short_put_K.toFixed(0)}</b>
              </div>
              <div>
                Long  Put K: <b>{r.long_put_K.toFixed(0)}</b>
              </div>
              <div>
                Short Call K: <b>{r.short_call_K.toFixed(0)}</b>
              </div>
              <div>
                Long  Call K: <b>{r.long_call_K.toFixed(0)}</b>
              </div>
            </div>
            <div className="text-xs opacity-80">
              SP: {r.sp_name} · LP: {r.lp_name} · SC: {r.sc_name} · LC: {r.lc_name}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                Max Loss: <b>${r.max_loss_usd.toFixed(2)}</b>
              </div>
              <div>
                EM: <b>${r.EM_usd.toFixed(2)}</b> ({(r.EM_pct * 100).toFixed(1)}%)
              </div>
              <div>
                Passes: <b>{r.passes ? "Yes" : "No"}</b>
              </div>
            </div>
            <div className="text-xs opacity-80">
              Liquidity check: {r.liquidity_ok ? "OK" : "Too wide"} · DTE: {r.dte} · Spot: $
              {r.spot_usd.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    ),
  },

  // NEW: Weekend Vol — static overlay (no scan / CSV)
  "weekend": {
    title: "Weekend Vol — Readiness",
    render: ({ underlying }) => <WeekendVolPane currency={underlying} />,
  },
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
  const showScanControls = !!impl?.scan; // hide controls for static overlays

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="text-sm grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] p-3 mb-4">
        <div>
          Strategy: <b>{meta?.name ?? strategyId}</b>
        </div>
        <div>
          Underlying: <b>{underlying}</b>
        </div>
        <div className="col-span-2">
          Expiry: <b>{new Date(expiryISO).toUTCString()}</b>
        </div>
      </div>

      {showScanControls && (
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
      )}

      {/* Static overlay content */}
      {impl?.render?.({ underlying, expiryISO })}

      {/* Scanner-style overlays */}
      {!impl?.render && !rows?.length && (
        <div className="text-sm text-[var(--fg-muted)]">
          {impl?.scan ? "No results yet. Click “Scan now”." : "This strategy has no scanner yet."}
        </div>
      )}
      {!impl?.render && rows?.length > 0 && impl?.renderRows ? impl.renderRows(rows) : null}
    </SideSheet>
  );
}
