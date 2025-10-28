// Minimal JSON-RPC over HTTP (public) to fetch DVOL candles.
// Docs: public/get_volatility_index_data (returns [ts, open, high, low, close]) 
// https://docs.deribit.com/  → method: public/get_volatility_index_data

export type DvolCandle = [number, number, number, number, number];

function normalizeVol(v: number): number {
  // Some feeds return decimals (0.21) and some percent (52.3). Normalize to percent.
  return v < 1 ? v * 100 : v;
}

export async function fetchDvolLatest(
  currency: "BTC" | "ETH" = "BTC",
  resolution: "60" | "3600" | "43200" | "1D" = "60"
): Promise<{ valuePct: number; ts: number }> {
  const now = Date.now();
  const start = now - 6 * 60 * 60 * 1000; // last 6h window is plenty for a latest close
  // Use a relative path so Vite dev proxy can avoid CORS.
  const url = `/api/v2/public/get_volatility_index_data?currency=${currency}&start_timestamp=${start}&end_timestamp=${now}&resolution=${resolution}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deribit HTTP ${res.status}`);
  const json = await res.json();
  const rows: DvolCandle[] = json?.result?.data ?? [];
  if (!rows.length) throw new Error("No DVOL data");
  const [ts, , , , close] = rows[rows.length - 1];
  return { valuePct: normalizeVol(close), ts };
}
