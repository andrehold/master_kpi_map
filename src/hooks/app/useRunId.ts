import { useEffect, useRef, useState } from "react";
import { startRun } from "../../api/kpiApi";

export function useRunId(currency: "BTC" | "ETH" = "BTC") {
  const [runId, setRunId] = useState<string | null>(null);
  const didStartRun = useRef(false);

  useEffect(() => {
    if (didStartRun.current) return; // dev StrictMode double-run guard
    didStartRun.current = true;

    (async () => {
      try {
        const r = await startRun(currency);
        setRunId(r.runId);
      } catch (e) {
        console.warn("KPI persistence disabled (API not reachable).", e);
        setRunId(null);
      }
    })();
  }, [currency]);

  return runId;
}
