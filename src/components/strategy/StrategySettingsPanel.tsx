// src/components/strategy/StrategySettingsPanel.tsx
import * as React from "react";
import { Button } from "../ui/Button";
import { STRATEGY_CATALOG, type StrategyKey } from "../../data/kpis";

export interface StrategySettingsPanelProps {
  strategyId: StrategyKey;
  /** Optional callback if the parent wants to close a sheet after save/cancel */
  onClose?: () => void;
}

export const StrategySettingsPanel: React.FC<StrategySettingsPanelProps> = ({
  strategyId,
  onClose,
}) => {
  const meta = STRATEGY_CATALOG[strategyId];

  // For now only Horizon has real settings
  if (strategyId !== "horizon") {
    return (
      <div className="space-y-2 text-sm">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Settings
        </div>
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-900)] px-3 py-3 text-[var(--fg-muted)]">
          No settings defined for <b>{meta?.name ?? strategyId}</b> yet.
          You can add per-strategy defaults via <code>STRATEGY_CATALOG</code>{" "}
          and extend this panel.
        </div>
      </div>
    );
  }

  const storageKey = `${strategyId}.settings`;

  const defaults = meta?.defaults ?? {};
  const [targetDte, setTargetDte] = React.useState<number>(
    defaults.targetDte ?? 14
  );
  const [dteMin, setDteMin] = React.useState<number>(defaults.dteMin ?? 7);
  const [dteMax, setDteMax] = React.useState<number>(defaults.dteMax ?? 21);
  const [shortMult, setShortMult] = React.useState<number>(
    defaults.shortEmMult ?? 1.0
  );
  const [hedgeMult, setHedgeMult] = React.useState<number>(
    defaults.hedgeEmMult ?? 1.6
  );
  const [minCredit, setMinCredit] = React.useState<number>(
    defaults.minCreditUsd ?? 50
  );
  const [maxBAFrac, setMaxBAFrac] = React.useState<number>(
    defaults.maxBaFrac ?? 0.05
  );

  // Load stored settings on mount / when strategy changes
  React.useEffect(() => {
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
    } catch {
      // ignore malformed storage
    }
  }, [storageKey]);

  const handleSave = React.useCallback(() => {
    const cfg = {
      targetDte,
      dteMin,
      dteMax,
      shortMult,
      hedgeMult,
      minCredit,
      maxBAFrac,
    };
    localStorage.setItem(storageKey, JSON.stringify(cfg));
    if (onClose) onClose();
  }, [
    targetDte,
    dteMin,
    dteMax,
    shortMult,
    hedgeMult,
    minCredit,
    maxBAFrac,
    storageKey,
    onClose,
  ]);

  const handleCancel = React.useCallback(() => {
    // Reset to stored (or defaults if none)
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const cfg = JSON.parse(raw);
        setTargetDte(cfg.targetDte ?? defaults.targetDte ?? 14);
        setDteMin(cfg.dteMin ?? defaults.dteMin ?? 7);
        setDteMax(cfg.dteMax ?? defaults.dteMax ?? 21);
        setShortMult(cfg.shortMult ?? defaults.shortEmMult ?? 1.0);
        setHedgeMult(cfg.hedgeMult ?? defaults.hedgeEmMult ?? 1.6);
        setMinCredit(cfg.minCredit ?? defaults.minCreditUsd ?? 50);
        setMaxBAFrac(cfg.maxBAFrac ?? defaults.maxBaFrac ?? 0.05);
      } else {
        setTargetDte(defaults.targetDte ?? 14);
        setDteMin(defaults.dteMin ?? 7);
        setDteMax(defaults.dteMax ?? 21);
        setShortMult(defaults.shortEmMult ?? 1.0);
        setHedgeMult(defaults.hedgeEmMult ?? 1.6);
        setMinCredit(defaults.minCreditUsd ?? 50);
        setMaxBAFrac(defaults.maxBaFrac ?? 0.05);
      }
    } catch {
      // fall back to defaults
      setTargetDte(defaults.targetDte ?? 14);
      setDteMin(defaults.dteMin ?? 7);
      setDteMax(defaults.dteMax ?? 21);
      setShortMult(defaults.shortEmMult ?? 1.0);
      setHedgeMult(defaults.hedgeEmMult ?? 1.6);
      setMinCredit(defaults.minCreditUsd ?? 50);
      setMaxBAFrac(defaults.maxBaFrac ?? 0.05);
    }
    if (onClose) onClose();
  }, [defaults, storageKey, onClose]);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Settings
        </div>
        <div className="text-[var(--fg-strong)]">
          {meta?.name ?? strategyId}
        </div>
        <div className="text-xs text-[var(--fg-muted)]">
          Customize default EM / DTE windows and quality filters for the
          Horizon scanner.
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs">
          Target DTE
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
            type="number"
            value={targetDte}
            onChange={(e) => setTargetDte(Number(e.target.value))}
          />
        </label>
        <label className="text-xs">
          DTE min
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
            type="number"
            value={dteMin}
            onChange={(e) => setDteMin(Number(e.target.value))}
          />
        </label>
        <label className="text-xs">
          DTE max
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
            type="number"
            value={dteMax}
            onChange={(e) => setDteMax(Number(e.target.value))}
          />
        </label>
        <label className="text-xs">
          Short EM mult
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
            type="number"
            step="0.05"
            value={shortMult}
            onChange={(e) => setShortMult(Number(e.target.value))}
          />
        </label>
        <label className="text-xs">
          Hedge EM mult
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
            type="number"
            step="0.05"
            value={hedgeMult}
            onChange={(e) => setHedgeMult(Number(e.target.value))}
          />
        </label>
        <label className="text-xs">
          Min credit (USD)
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
            type="number"
            step="1"
            value={minCredit}
            onChange={(e) => setMinCredit(Number(e.target.value))}
          />
        </label>
        <label className="text-xs">
          Max bid/ask fraction
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
            type="number"
            step="0.01"
            value={maxBAFrac}
            onChange={(e) => setMaxBAFrac(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      <div className="text-[10px] text-[var(--fg-muted)]">
        Saved under <code>{storageKey}</code>. Your scanner can read/merge
        these with defaults from <code>STRATEGY_CATALOG</code> or override{" "}
        <code>HORIZON_CFG</code> in <code>horizonScan.ts</code>.
      </div>
    </div>
  );
};
