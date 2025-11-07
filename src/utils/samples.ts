import type { KPIValueType, KPIGroup } from "../data/kpis";

export type Samples = Record<string, string>;

function rand(min: number, max: number, decimals = 1) {
  const v = Math.random() * (max - min) + min;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

export function sampleFor(type: KPIValueType): string {
  switch (type) {
    case "percent": return `${rand(0, 150, 1).toFixed(1)}%`;
    case "ivrank": return `${Math.round(rand(0, 100, 0))}`;
    case "ratio": return `${rand(0.3, 2.5, 2).toFixed(2)}×`;
    case "bps": return `${Math.round(rand(0, 150, 0))} bps`;
    case "sigma": return `${rand(0.1, 5.0, 2).toFixed(2)}σ`;
    case "index": return `${rand(5, 60, 1).toFixed(1)}`;
    case "ms": return `${Math.round(rand(8, 120, 0))} ms`;
    case "price": return `${rand(-3.5, 3.5, 2).toFixed(2)}`;
    case "text": {
      const isContango = Math.random() > 0.35;
      const v = rand(0.0, 8.0, 1) * (isContango ? 1 : -1);
      return `${isContango ? "Contango" : "Backwardation"} (${v.toFixed(1)}%)`;
    }
    case "custom": return "—";
    default: return "—";
  }
}

export function buildSamples(groups: KPIGroup[]): Samples {
  const s: Samples = {};
  for (const g of groups) {
    for (const k of g.kpis) {
      s[k.id] = sampleFor(k.valueType);
    }
  }
  return s;
}
