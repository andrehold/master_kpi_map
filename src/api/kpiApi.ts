export async function startRun(currency: "BTC" | "ETH" = "BTC") {
  const r = await fetch("/api/runs/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency }),
  });
  if (!r.ok) throw new Error(`startRun failed: ${r.status}`);
  return (await r.json()) as { runId: string };
}

export async function postSnapshot(snapshot: unknown) {
  const r = await fetch("/api/snapshots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!r.ok) throw new Error(`postSnapshot failed: ${r.status}`);
}

// Fetch timeseries data for a specific KPI
export async function fetchTimeseries(kpiId: string, runId: string, limit: number = 100) {
  const r = await fetch(`/api/timeseries?kpiId=${kpiId}&runId=${runId}&limit=${limit}`);
  
  if (!r.ok) throw new Error(`fetchTimeseries failed: ${r.status}`);
  return await r.json();
}
  