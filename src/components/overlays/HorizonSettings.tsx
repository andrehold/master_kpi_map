import * as React from "react";
import { SideSheet } from "@/components/ui/SideSheet";
import { Button } from "../ui/Button";

export function HorizonSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // For now this is a stub; wire to your config later if desired.
  const [targetDte, setTargetDte] = React.useState(14);
  const [dteMin, setDteMin] = React.useState(7);
  const [dteMax, setDteMax] = React.useState(21);
  const [shortMult, setShortMult] = React.useState(1.0);
  const [hedgeMult, setHedgeMult] = React.useState(1.6);
  const [minCredit, setMinCredit] = React.useState(50);
  const [maxBAFrac, setMaxBAFrac] = React.useState(0.05);

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title="Horizon Settings">
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
            localStorage.setItem("horizon.settings", JSON.stringify(cfg));
            onOpenChange(false);
          }}>Save</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>

        <div className="text-xs opacity-80">
          Note: this stub stores values to <code>localStorage</code> under <code>horizon.settings</code>.  
          Hook these into your scan service when you’re ready.
        </div>
      </div>
    </SideSheet>
  );
}
