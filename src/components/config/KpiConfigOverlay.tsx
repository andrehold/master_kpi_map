import React from "react";
import {
  KPI_CONFIG_DEFS,
  useKpiConfig,
  type KpiParamDescriptor,
  type NumberParam,
  type NumberArrayParam,
} from "../../config/kpiConfig";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const KpiConfigOverlay: React.FC<Props> = ({ open, onClose }) => {
  const [config, setParam, resetAll] = useKpiConfig();

  if (!open) return null;

  const handleNumberChange = (
    kpiId: any,
    param: NumberParam,
    raw: string
  ) => {
    if (raw === "") {
      setParam(kpiId, param.id, param.defaultValue);
      return;
    }
    const value = Number(raw);
    if (Number.isNaN(value)) return;

    let clamped = value;
    if (param.min != null) clamped = Math.max(clamped, param.min);
    if (param.max != null) clamped = Math.min(clamped, param.max);

    setParam(kpiId, param.id, clamped);
  };

  const handleNumberArrayChange = (
    kpiId: any,
    param: NumberArrayParam,
    raw: string
  ) => {
    const nums = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));

    if (!nums.length) {
      setParam(kpiId, param.id, param.defaultValue);
      return;
    }
    setParam(kpiId, param.id, nums);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40">
      {/* Panel with solid white background */}
      <div className="mt-16 max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)] text-[var(--fg)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">KPI Configuration</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-[var(--border)] bg-[var(--surface-900)] px-3 py-1 text-sm text-[var(--fg)] hover:bg-[var(--surface-950)]"
              onClick={resetAll}
            >
              Reset to defaults
            </button>
            <button
              type="button"
              className="rounded-md bg-[var(--fg)] px-3 py-1 text-sm font-medium text-[var(--bg)] hover:opacity-90"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {KPI_CONFIG_DEFS.map((def) => {
            const values = config[def.kpiId] ?? {};
            return (
              <section
                key={String(def.kpiId)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-900)]/40 p-4"
              >
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                  {def.label}
                </h3>
                <div className="space-y-3">
                  {def.params.map((param: KpiParamDescriptor) => {
                    const value = values[param.id] ?? param.defaultValue;

                    if (param.type === "number") {
                      const numParam = param as NumberParam;
                      return (
                        <div key={param.id} className="space-y-1">
                          <label className="flex items-baseline justify-between text-xs font-medium text-[var(--fg)]">
                            <span>{param.label}</span>
                            {numParam.unit && (
                              <span className="text-[10px] uppercase text-[var(--fg-muted)]">
                                {numParam.unit}
                              </span>
                            )}
                          </label>
                          {param.description && (
                            <p className="text-[11px] text-[var(--fg-muted)]">
                              {param.description}
                            </p>
                          )}
                          <input
                            type="number"
                            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-950)] px-2 py-1 text-sm text-[var(--fg)]"
                            value={String(value ?? "")}
                            min={numParam.min}
                            max={numParam.max}
                            step={numParam.step ?? 1}
                            onChange={(e) =>
                              handleNumberChange(
                                def.kpiId,
                                numParam,
                                e.target.value
                              )
                            }
                          />
                        </div>
                      );
                    }

                    if (param.type === "number[]") {
                      const arrParam = param as NumberArrayParam;
                      const arrValue = Array.isArray(value)
                        ? (value as number[])
                        : arrParam.defaultValue;
                      return (
                        <div key={param.id} className="space-y-1">
                          <label className="flex items-baseline justify-between text-xs font-medium text-[var(--fg)]">
                            <span>{param.label}</span>
                            {arrParam.unit && (
                              <span className="text-[10px] uppercase text-[var(--fg-muted)]">
                                {arrParam.unit}
                              </span>
                            )}
                          </label>
                          {param.description && (
                            <p className="text-[11px] text-[var(--fg-muted)]">
                              {param.description}
                            </p>
                          )}
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-950)] px-2 py-1 text-sm text-[var(--fg)]"
                            value={arrValue.join(", ")}
                            onChange={(e) =>
                              handleNumberArrayChange(
                                def.kpiId,
                                arrParam,
                                e.target.value
                              )
                            }
                            placeholder="e.g. 4, 7, 21, 30, 60"
                          />
                        </div>
                      );
                    }

                    // string params
                    return (
                      <div key={param.id} className="space-y-1">
                        <label className="text-xs font-medium text-[var(--fg)]">
                          {param.label}
                        </label>
                        {param.description && (
                          <p className="text-[11px] text-[var(--fg-muted)]">
                            {param.description}
                          </p>
                        )}
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-950)] px-2 py-1 text-sm text-[var(--fg)]"
                          value={String(value ?? "")}
                          onChange={(e) =>
                            setParam(def.kpiId, param.id, e.target.value)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
