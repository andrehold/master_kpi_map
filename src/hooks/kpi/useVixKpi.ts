// src/hooks/useVixKpi.ts
import { useEffect, useMemo, useState } from "react";
import { getLatestVix } from "../../services/fred";

export type VixKpiStatus = "idle" | "loading" | "ready" | "error";

export interface VixKpiViewModel {
  status: VixKpiStatus;
  /** Formatted value for display on the KPI card, e.g. "18.3" */
  value: string | null;
  extraBadge?: string | null;
  /** Raw numeric VIX value for bands / guidance. */
  guidanceValue: number | null;
  /** Optional meta line, e.g. "FRED • 26 Nov 2025". */
  meta?: string;
  /** Unix timestamp (ms) for the observation date. */
  ts: number | null;
  /** User-friendly error message (for drawer / debug). */
  errorMessage: string | null;
}

export function useVixKpi(): VixKpiViewModel {
  const [status, setStatus] = useState<VixKpiStatus>("idle");
  const [rawValue, setRawValue] = useState<number | null>(null);
  const [ts, setTs] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus("loading");
      setErrorMessage(null);

      try {
        const latest = await getLatestVix(); // domain helper from fred.ts

        if (!latest || cancelled) {
          if (!latest && !cancelled) {
            setStatus("error");
            setErrorMessage("No VIX data available from FRED.");
          }
          return;
        }

        if (cancelled) return;

        setRawValue(latest.value);
        setTs(latest.ts);
        setStatus("ready");
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err?.message ?? "Failed to fetch VIX from FRED.");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    if (rawValue == null) return null;
    return rawValue.toFixed(1); // e.g. 18.3
  }, [rawValue]);

  const meta = useMemo(() => {
    if (!ts) return undefined;

    // FRED gives date as YYYY-MM-DD; we converted to UTC midnight in getLatestVix.
    // Use a short localized date, plus a source tag.
    const d = new Date(ts);
    const dateStr = d.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

    return `FRED • ${dateStr}`;
  }, [ts]);

  let extraBadge: string | null = null;
  if (status === "loading") {
    extraBadge = "Refreshing…";
  }

  return {
    status,
    value,
    extraBadge, 
    guidanceValue: rawValue,
    meta,
    ts,
    errorMessage,
  };
}
