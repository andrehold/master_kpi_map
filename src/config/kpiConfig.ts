// src/config/kpiConfig.ts
import { useCallback, useState } from "react";
import { KPI_IDS, type KpiId } from "../kpi/kpiIds";

//
// Types
//

export type KpiParamValue = number | string | number[];

type ParamType = "number" | "string" | "number[]";

interface BaseParam<TType extends ParamType, TValue extends KpiParamValue> {
  id: string;
  type: TType;
  label: string;
  description?: string;
  defaultValue: TValue;
}

export type NumberParam = BaseParam<"number", number> & {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type StringParam = BaseParam<"string", string>;

export type NumberArrayParam = BaseParam<"number[]", number[]> & {
  unit?: string;
};

export type KpiParamDescriptor = NumberParam | StringParam | NumberArrayParam;

export interface KpiConfigDefinition {
  kpiId: KpiId;
  label: string;
  params: KpiParamDescriptor[];
}

export type KpiConfigValues = {
  [K in KpiId]?: Record<string, KpiParamValue>;
};

//
// Definitions: which KPIs are configurable + their params
//

export const KPI_CONFIG_DEFS: KpiConfigDefinition[] = [
  {
    kpiId: KPI_IDS.termStructure,
    label: "IV Term Structure",
    params: [
      {
        id: "curveTenors",
        type: "number[]",
        label: "Curve tenors (DTE)",
        description: "Tenors used for the term structure curve and mini table.",
        defaultValue: [1, 4, 7, 21, 30, 60],
        unit: "DTE",
      },
      {
        id: "shortTenor",
        type: "number",
        label: "Short tenor for slope",
        description: "Short-end tenor used to compute contango / backwardation.",
        defaultValue: 4,
        min: 1,
        max: 30,
        step: 1,
        unit: "DTE",
      },
      {
        id: "longTenor",
        type: "number",
        label: "Long tenor for slope",
        description: "Long-end tenor used to compute contango / backwardation.",
        defaultValue: 30,
        min: 7,
        max: 365,
        step: 1,
        unit: "DTE",
      },
    ],
  },
  {
    kpiId: KPI_IDS.atmIv,
    label: "ATM IV",
    params: [
      {
        id: "primaryTenor",
        type: "number",
        label: "Primary tenor (DTE)",
        description: "Tenor used for the main ATM IV value.",
        defaultValue: 21,
        min: 1,
        max: 365,
        step: 1,
        unit: "DTE",
      },
      {
        id: "extraTenors",
        type: "number[]",
        label: "Extra mini-table tenors (DTE)",
        description: "Additional tenors shown in the ATM IV mini table.",
        defaultValue: [7, 30, 60],
        unit: "DTE",
      },
    ],
  },
  {
    kpiId: KPI_IDS.gammaCenterOfMass,
    label: "Gamma Center of Mass",
    params: [
      {
        id: "gravityBandPct",
        type: "number",
        label: "Gamma gravity band (±%)",
        description:
          "Half-width of the spot band used to compute Gamma Gravity (share of gamma within ±band of spot).",
        defaultValue: 5, // your previous GRAVITY_BAND = 0.05
        min: 1,
        max: 25,
        step: 1,
        unit: "%",
      },
    ],
  },
  // Add more KPIs here as they become configurable
];

//
// Internal helpers: defaults, load/save
//

const STORAGE_KEY = "kpi-config.v1";

function buildDefaultConfig(): KpiConfigValues {
  const values: KpiConfigValues = {};
  for (const def of KPI_CONFIG_DEFS) {
    const params: Record<string, KpiParamValue> = {};
    for (const p of def.params) {
      params[p.id] = p.defaultValue;
    }
    values[def.kpiId] = params;
  }
  return values;
}

function mergeWithDefaults(raw: unknown): KpiConfigValues {
  const defaults = buildDefaultConfig();
  if (!raw || typeof raw !== "object") return defaults;

  try {
    const parsed = raw as KpiConfigValues;
    const merged: KpiConfigValues = { ...defaults };

    for (const def of KPI_CONFIG_DEFS) {
      const kpiId = def.kpiId;
      const existing = parsed[kpiId] ?? {};
      const next: Record<string, KpiParamValue> = {};

      for (const p of def.params) {
        const maybe = (existing as any)[p.id];
        next[p.id] =
          maybe === undefined || maybe === null ? p.defaultValue : maybe;
      }

      merged[kpiId] = next;
    }

    return merged;
  } catch {
    return defaults;
  }
}

function loadInitialConfig(): KpiConfigValues {
  if (typeof window === "undefined") {
    return buildDefaultConfig();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultConfig();
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch (err) {
    console.error("[kpiConfig] Failed to load config from storage", err);
    return buildDefaultConfig();
  }
}

function persistConfig(values: KpiConfigValues) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch (err) {
    console.error("[kpiConfig] Failed to persist config", err);
  }
}

let currentConfig: KpiConfigValues | null = null;

function getOrInitConfig(): KpiConfigValues {
  if (!currentConfig) {
    currentConfig = loadInitialConfig();
  }
  return currentConfig;
}

function setConfig(next: KpiConfigValues) {
  currentConfig = next;
  persistConfig(next);
}

//
// Public API
//

export function getKpiParam<T extends KpiParamValue>(
  kpiId: KpiId,
  paramId: string
): T | undefined {
  const cfg = getOrInitConfig();
  return cfg[kpiId]?.[paramId] as T | undefined;
}

export function getKpiParamsFor(kpiId: KpiId): Record<string, KpiParamValue> {
  const cfg = getOrInitConfig();
  return (cfg[kpiId] ?? {}) as Record<string, KpiParamValue>;
}

export function useKpiConfig(): [
  KpiConfigValues,
  (kpiId: KpiId, paramId: string, value: KpiParamValue) => void,
  () => void
] {
  const [config, setLocalConfig] = useState<KpiConfigValues>(() =>
    getOrInitConfig()
  );

  const setParam = useCallback(
    (kpiId: KpiId, paramId: string, value: KpiParamValue) => {
      setLocalConfig((prev) => {
        const next: KpiConfigValues = {
          ...prev,
          [kpiId]: {
            ...(prev[kpiId] ?? {}),
            [paramId]: value,
          },
        };
        setConfig(next);
        return next;
      });
    },
    []
  );

  const resetAll = useCallback(() => {
    const defaults = buildDefaultConfig();
    setConfig(defaults);
    setLocalConfig(defaults);
  }, []);

  return [config, setParam, resetAll];
}
