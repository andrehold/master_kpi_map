// src/types/kpiSnapshot.ts
import type { KpiId } from "../kpi/kpiIds";

export type KpiTone = "good" | "neutral" | "warn" | "bad" | "unknown";
export type KpiStatus = "loading" | "ready" | "error" | "empty";

export type KpiPoint = {
  key: string;                 // "main", "30d", "50d", ...
  label: string;               // "ATM IV (30D)"
  value: number | null;        // numeric if available
  formatted: string;           // what you show in UI
  tone?: KpiTone;
};

export type KpiSnapshot = {
  runId: string;
  kpiId: KpiId;
  currency?: "BTC" | "ETH";
  ts: number;                  // Date.now()
  status: KpiStatus;
  main: KpiPoint | null;
  mini: KpiPoint[];            // mini-table rows
  meta?: Record<string, unknown>; // optional: dte, exchange, etc
  error?: string;
};
