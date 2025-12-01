// src/components/strategy/StrategyScannerPanel.tsx
import * as React from "react";
import { Button } from "../ui/Button";
import { STRATEGY_CATALOG, type StrategyKey } from "../../data/kpis";
import {
  scanHorizonBTCUSD,
  horizonRowsToCSV,
  downloadCSV,
  type HorizonRow,
} from "../../services/horizonScan";
import { Loader2, RefreshCw, Download } from "lucide-react";

export interface StrategyScannerPanelProps {
  strategyId: StrategyKey;
}

function fmtUsd(x: number | null | undefined, digits = 2): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(x: number | null | undefined, digits = 2): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return (x * 100).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }) + " %";
}

export const StrategyScannerPanel: React.FC<StrategyScannerPanelProps> = ({
  strategyId,
}) => {
  const meta = STRATEGY_CATALOG[strategyId];

  const [rows, setRows] = React.useState<HorizonRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isHorizon = strategyId === "horizon";

  const handleScan = React.useCallback(async () => {
    if (!isHorizon) return;
    setLoading(true);
    setError(null);
    try {
      const res = await scanHorizonBTCUSD();
      setRows(res);
      if (!res.length) {
        setError("No suitable expiries / EM candidates found in the current window.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Scan failed – see console for details.");
    } finally {
      setLoading(false);
    }
  }, [isHorizon]);

  const handleDownload = React.useCallback(async () => {
    if (!isHorizon) return;
    try {
      let currentRows = rows;
      if (!currentRows.length) {
        setLoading(true);
        const res = await scanHorizonBTCUSD();
        setRows(res);
        currentRows = res;
      }
      const csv = horizonRowsToCSV(currentRows);
      if (csv) downloadCSV(csv);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "CSV export failed.");
    } finally {
      setLoading(false);
    }
  }, [isHorizon, rows]);

  if (!isHorizon) {
    return (
      <div className="space-y-2 text-sm">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Scanner
        </div>
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-900)] px-3 py-3 text-[var(--fg-muted)]">
          No scanner has been wired for{" "}
          <b>{meta?.name ?? strategyId}</b> yet. You can add one by
          implementing a service similar to <code>horizonScan.ts</code> and
          plugging it into this panel.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Horizon scanner
          </div>
          <div className="text-[var(--fg-muted)] text-xs">
            EM-based BTC condor candidates (Deribit)
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleScan}
            disabled={loading}
            className="inline-flex items-center gap-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Scan candidates</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-900)]">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-[var(--surface-800)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">DTE</th>
              <th className="px-3 py-2 text-left font-medium">EM (USD / %)</th>
              <th className="px-3 py-2 text-left font-medium">Short strikes</th>
              <th className="px-3 py-2 text-left font-medium">Hedge strikes</th>
              <th className="px-3 py-2 text-right font-medium">Credit (USD)</th>
              <th className="px-3 py-2 text-right font-medium">Max loss (USD)</th>
              <th className="px-3 py-2 text-center font-medium">Liquidity OK</th>
              <th className="px-3 py-2 text-center font-medium">Passes filters</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={idx}
                className="border-t border-[var(--border)] even:bg-[var(--surface-950)]/40"
              >
                <td className="px-3 py-2">{r.dte}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-mono">
                      {fmtUsd(r.EM_usd, 2)}
                    </span>
                    <span className="text-[11px] text-[var(--fg-muted)]">
                      {fmtPct(r.EM_pct, 2)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="font-mono">
                    {fmtUsd(r.short_put_K, 0)} / {fmtUsd(r.short_call_K, 0)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="font-mono">
                    {fmtUsd(r.long_put_K, 0)} / {fmtUsd(r.long_call_K, 0)}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {fmtUsd(r.credit_mid_usd, 2)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {fmtUsd(r.max_loss_usd, 2)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " +
                      (r.liquidity_ok
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-amber-500/10 text-amber-200")
                    }
                  >
                    {r.liquidity_ok ? "OK" : "Tighten"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " +
                      (r.passes
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-rose-500/10 text-rose-300")
                    }
                  >
                    {r.passes ? "Pass" : "Fail"}
                  </span>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-center text-[var(--fg-muted)]"
                >
                  No candidates yet. Click{" "}
                  <span className="font-semibold">Scan candidates</span> to
                  pull the current Horizon universe.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-center text-[var(--fg-muted)]"
                >
                  Scanning Deribit book…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
