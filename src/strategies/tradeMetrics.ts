// src/strategies/tradeMetrics.ts

/**
 * Known trade metric IDs used in StrategyTradeKitConfig.summaryMetricIds.
 *
 * If you add more metric IDs in strategyChecklists.ts, extend this union.
 */
export type TradeMetricId =
  | "totalCredit"
  | "totalDebit"
  | "maxProfit"
  | "maxLoss"
  | "rr"
  | "thetaCapture";

/**
 * The shape we expect for trade-kit summary data.
 * This intentionally matches your TradeKitSummaryState:
 *
 *   export type TradeKitSummaryState = {
 *     [metricId: string]: number | null | undefined;
 *     totalCredit?: number | null;
 *     totalDebit?: number | null;
 *     maxProfit?: number | null;
 *     maxLoss?: number | null;
 *     rr?: number | null;
 *   };
 *
 * but we keep it local and generic so there are no circular imports.
 */
export type TradeMetricSummaryLike = Record<string, number | null | undefined>;

/**
 * Supported numeric scales, in case you later want metric-specific
 * formatting (BTC, %, etc.).
 */
export type TradeMetricScale = "btc" | "usd" | "percent" | "ratio" | "raw";

export interface TradeMetricDef {
  id: TradeMetricId;
  /** Human-readable label for the UI. */
  label: string;
  /** Optional human-readable description (tooltip, docs, etc.). */
  description?: string;
  /** Optional scale for formatting (BTC, %, etc.). */
  valueScale?: TradeMetricScale;
  /**
   * Compute the raw numeric value from the trade-kit summary.
   * Most metrics just pass through from precomputed summary fields,
   * but you can centralize derived formulas here (e.g. rr).
   */
  compute(summary: TradeMetricSummaryLike): number | null;
  /**
   * Optional custom formatter for this metric.
   * If omitted, a generic default formatter is used.
   */
  format?(value: number | null): string;
}

/**
 * Default numeric formatter – used if a metric doesn't provide its own.
 */
function defaultFormat(value: number | null, scale?: TradeMetricScale): string {
  if (value == null || Number.isNaN(value)) return "n/a";

  // You can customize per-scale formatting here later (e.g. add "x" or "%").
  switch (scale) {
    case "percent":
      return (value * 100).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
    case "ratio":
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
    case "btc":
    case "usd":
    case "raw":
    default:
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 4,
      });
  }
}

/**
 * Central registry of trade metrics.
 *
 * NOTE:
 * - For now, most metrics just forward from summary["metricId"].
 * - "rr" will fall back to maxProfit / maxLoss if summary["rr"] is missing.
 * - "thetaCapture" expects summary["thetaCapture"] to be populated by the
 *   strategy-specific hook (Weekend Vol, etc.).
 */
export const TRADE_METRIC_DEFS: Record<TradeMetricId, TradeMetricDef> = {
  totalCredit: {
    id: "totalCredit",
    label: "Total credit",
    description: "Net credit received for the structure (per 1x position).",
    valueScale: "btc", // or "usd" depending on your convention
    compute: (summary) => {
      const v = summary["totalCredit"];
      return typeof v === "number" && !Number.isNaN(v) ? v : null;
    },
    format: (value) => defaultFormat(value, "btc"),
  },

  totalDebit: {
    id: "totalDebit",
    label: "Total debit",
    description: "Net debit paid for the structure (per 1x position).",
    valueScale: "btc",
    compute: (summary) => {
      const v = summary["totalDebit"];
      return typeof v === "number" && !Number.isNaN(v) ? v : null;
    },
    format: (value) => defaultFormat(value, "btc"),
  },

  maxProfit: {
    id: "maxProfit",
    label: "Max profit",
    description: "Theoretical maximum profit if the structure is held to expiry.",
    valueScale: "btc",
    compute: (summary) => {
      const v = summary["maxProfit"];
      return typeof v === "number" && !Number.isNaN(v) ? v : null;
    },
    format: (value) => defaultFormat(value, "btc"),
  },

  maxLoss: {
    id: "maxLoss",
    label: "Max loss",
    description: "Worst-case loss if the structure is held to expiry.",
    valueScale: "btc",
    compute: (summary) => {
      const v = summary["maxLoss"];
      return typeof v === "number" && !Number.isNaN(v) ? v : null;
    },
    format: (value) => defaultFormat(value, "btc"),
  },

  rr: {
    id: "rr",
    label: "R:R",
    description: "Risk–reward ratio (max profit ÷ max loss).",
    valueScale: "ratio",
    compute: (summary) => {
      const explicit = summary["rr"];
      if (typeof explicit === "number" && !Number.isNaN(explicit)) {
        return explicit;
      }

      const maxProfit = summary["maxProfit"];
      const maxLoss = summary["maxLoss"];

      if (
        typeof maxProfit === "number" &&
        !Number.isNaN(maxProfit) &&
        typeof maxLoss === "number" &&
        !Number.isNaN(maxLoss) &&
        maxLoss !== 0
      ) {
        return maxProfit / Math.abs(maxLoss);
      }

      return null;
    },
    format: (value) => defaultFormat(value, "ratio"),
  },

  thetaCapture: {
    id: "thetaCapture",
    label: "Theta capture",
    description:
      "Carry efficiency / theta capture metric (strategy-specific definition).",
    valueScale: "ratio", // or "percent" depending on how you define it
    compute: (summary) => {
      // Expect a precomputed field from the strategy-specific hook.
      const v = summary["thetaCapture"];
      return typeof v === "number" && !Number.isNaN(v) ? v : null;
    },
    format: (value) => defaultFormat(value, "ratio"),
  },
};

/**
 * Get a metric definition by id (string). Returns undefined
 * if the id is not in TRADE_METRIC_DEFS.
 */
export function getTradeMetricDef(
  metricId: string
): TradeMetricDef | undefined {
  return TRADE_METRIC_DEFS[metricId as TradeMetricId];
}

/**
 * Convenience helper: compute value + formatted text for a metric id.
 *
 * If the metric id is unknown, this falls back to reading summary[metricId]
 * and using the default formatter.
 */
export function computeAndFormatTradeMetric(
  metricId: string,
  summary: TradeMetricSummaryLike
): { value: number | null; formatted: string; label: string } {
  const def = getTradeMetricDef(metricId);

  if (!def) {
    const raw = summary[metricId];
    const v =
      typeof raw === "number" && !Number.isNaN(raw) ? (raw as number) : null;
    return {
      value: v,
      formatted: defaultFormat(v, "raw"),
      label: metricId,
    };
  }

  const raw = def.compute(summary);
  const formatted = def.format
    ? def.format(raw)
    : defaultFormat(raw, def.valueScale);

  return {
    value: raw,
    formatted,
    label: def.label,
  };
}
