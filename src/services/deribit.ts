export type DvolCandle = [ts: number, open: number, high: number, low: number, close: number];

function normalizeVol(v: number): number {
  // DVOL may come as 0.45 (45%) or 45.0 (%). Normalize to percent.
  return v < 1 ? v * 100 : v;
}

/** Latest DVOL close over a small recent window (minutes→hours). */
export async function fetchDvolLatest(
  currency: "BTC" | "ETH" = "BTC",
  resolutionSec: 60 | 3600 = 60
): Promise<{ valuePct: number; ts: number }> {
  const now = Date.now();
  const start = now - 6 * 60 * 60 * 1000;
  const url = `/api/v2/public/get_volatility_index_data?currency=${currency}&start_timestamp=${start}&end_timestamp=${now}&resolution=${resolutionSec}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deribit HTTP ${res.status}`);
  const json = await res.json();
  const rows: DvolCandle[] = json?.result?.data ?? [];
  if (!rows.length) throw new Error("No DVOL data");
  const [ts, , , , close] = rows[rows.length - 1];
  return { valuePct: normalizeVol(close), ts };
}

/** DVOL history for IVR/IVP (default ~400 days @ daily). */
export async function fetchDvolHistory(
  currency: "BTC" | "ETH" = "BTC",
  days = 400,
  resolutionSec = 86400 // daily
): Promise<Array<{ ts: number; closePct: number }>> {
  const end = Date.now();
  const start = end - days * 24 * 60 * 60 * 1000;
  const url = `/api/v2/public/get_volatility_index_data?currency=${currency}&start_timestamp=${start}&end_timestamp=${end}&resolution=${resolutionSec}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deribit HTTP ${res.status}`);
  const json = await res.json();
  const rows: DvolCandle[] = json?.result?.data ?? [];
  return rows.map(([ts, , , , close]) => ({ ts, closePct: normalizeVol(close) }));
}
