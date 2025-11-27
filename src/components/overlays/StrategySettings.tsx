import * as React from "react";
import { SideSheet } from "../../components/ui/SideSheet";
import { Button } from "../../components/ui/Button";
import { STRATEGY_CATALOG, type StrategyKey } from "../../data/kpis";

export function StrategySettings({
  open,
  onOpenChange,
  strategyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  strategyId: StrategyKey;
}) {
  const meta = STRATEGY_CATALOG[strategyId];
  const storageKey = `${strategyId}.settings`;

  // horizon defaults (only used if present in the catalog)
  const d = meta?.defaults ?? {};
  const [targetDte, setTargetDte] = React.useState(d.targetDte ?? 14);
  const [dteMin, setDteMin] = React.useState(d.dteMin ?? 7);
  const [dteMax, setDteMax] = React.useState(d.dteMax ?? 21);
  const [shortMult, setShortMult] = React.useState(d.shortEmMult ?? 1.0);
  const [hedgeMult, setHedgeMult] = React.useState(d.hedgeEmMult ?? 1.6);
  const [minCredit, setMinCredit] = React.useState(d.minCreditUsd ?? 50);
  const [maxBAFrac, setMaxBAFrac] = React.useState(d.maxBaFrac ?? 0.05);

  React.useEffect(() => {
    // load when opening
    if (open) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const cfg = JSON.parse(raw);
          if (cfg.targetDte != null) setTargetDte(cfg.targetDte);
          if (cfg.dteMin != null) setDteMin(cfg.dteMin);
          if (cfg.dteMax != null) setDteMax(cfg.dteMax);
          if (cfg.shortMult != null) setShortMult(cfg.shortMult);
          if (cfg.hedgeMult != null) setHedgeMult(cfg.hedgeMult);
          if (cfg.minCredit != null) setMinCredit(cfg.minCredit);
          if (cfg.maxBAFrac != null) setMaxBAFrac(cfg.maxBAFrac);
        }
      } catch {}
    }
  }, [open, storageKey]);

  const isHorizon = strategyId === "horizon";

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title={`${meta?.name ?? strategyId} Settings`}>
      {isHorizon ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Target DTE
              <input className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                     type="number" value={targetDte} onChange={e=>setTargetDte(Number(e.target.value))}/>
            </label>
            <label className="text-sm">DTE Min
              <input className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                     type="number" value={dteMin} onChange={e=>setDteMin(Number(e.target.value))}/>
            </label>
            <label className="text-sm">DTE Max
              <input className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                     type="number" value={dteMax} onChange={e=>setDteMax(Number(e.target.value))}/>
            </label>
            <label className="text-sm">Short EM Mult
              <input className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                     type="number" step="0.05" value={shortMult} onChange={e=>setShortMult(Number(e.target.value))}/>
            </label>
            <label className="text-sm">Hedge EM Mult
              <input className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                     type="number" step="0.05" value={hedgeMult} onChange={e=>setHedgeMult(Number(e.target.value))}/>
            </label>
            <label className="text-sm">Min Credit (USD)
              <input className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                     type="number" step="1" value={minCredit} onChange={e=>setMinCredit(Number(e.target.value))}/>
            </label>
            <label className="text-sm">Max Bid/Ask frac
              <input className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                     type="number" step="0.01" value={maxBAFrac} onChange={e=>setMaxBAFrac(Number(e.target.value))}/>
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => {
              const cfg = { targetDte, dteMin, dteMax, shortMult, hedgeMult, minCredit, maxBAFrac };
              localStorage.setItem(storageKey, JSON.stringify(cfg));
              onOpenChange(false);
            }}>Save</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>

          <div className="text-xs opacity-80">
            Saved under <code>{storageKey}</code>. Your scanner can read/merge these with defaults from <code>STRATEGY_CATALOG</code>.
          </div>
        </div>
      ) : (
        <div className="text-sm text-[var(--fg-muted)]">
          No settings defined for <b>{meta?.name ?? strategyId}</b> yet.
        </div>
      )}
    </SideSheet>
  );
}
