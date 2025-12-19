import React from "react";

type TableInfo = { name: string; type: "table" | "view" };
type TableResp = {
  table: string;
  columns: string[];
  rows: Record<string, any>[];
  total: number;
  limit: number;
  offset: number;
};

const API_BASE = (import.meta as any).env?.VITE_DB_API_BASE || "http://localhost:8787";

export function DbBrowser() {
  const [tables, setTables] = React.useState<TableInfo[]>([]);
  const [table, setTable] = React.useState<string>("");
  const [data, setData] = React.useState<TableResp | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [limit, setLimit] = React.useState(200);
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      setError(null);
      const r = await fetch(`${API_BASE}/api/db/tables`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j?.error || `Failed to load tables (${r.status})`);
        return;
      }
      setTables(j.tables || []);
      if (!table && j.tables?.[0]?.name) setTable(j.tables[0].name);
    })().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!table) return;
    (async () => {
      setError(null);
      setData(null);
      const r = await fetch(
        `${API_BASE}/api/db/table/${encodeURIComponent(table)}?limit=${limit}&offset=${offset}`
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j?.error || `Failed to load table (${r.status})`);
        return;
      }
      setData(j);
    })().catch(console.error);
  }, [table, limit, offset]);

  const downloadDb = () => window.open(`${API_BASE}/api/db/download`, "_blank");
  const downloadCsv = () => window.open(`${API_BASE}/api/db/table/${encodeURIComponent(table)}.csv`, "_blank");

  return (
    <div className="p-4 space-y-3">
      {error ? (
        <div className="text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-900)] p-3">
          <div className="font-semibold mb-1">DB Browser error</div>
          <div className="text-[var(--fg-muted)] break-words">{error}</div>
          <div className="text-xs text-[var(--fg-muted)] mt-2">
            API: {API_BASE}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm opacity-70">SQLite browser</div>

        <select
          className="px-2 py-1 rounded bg-[var(--bg-2)] text-sm"
          value={table}
          onChange={(e) => {
            setOffset(0);
            setTable(e.target.value);
          }}
        >
          {tables.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.type})
            </option>
          ))}
        </select>

        <label className="text-sm opacity-70 ml-2">limit</label>
        <input
          className="w-24 px-2 py-1 rounded bg-[var(--bg-2)] text-sm"
          type="number"
          value={limit}
          min={1}
          max={2000}
          onChange={(e) => {
            setOffset(0);
            setLimit(Math.max(1, Math.min(2000, Number(e.target.value || 200))));
          }}
        />

        <button className="ml-auto px-3 py-1 rounded bg-[var(--bg-2)] text-sm" onClick={downloadCsv}>
          Download CSV
        </button>
        <button className="px-3 py-1 rounded bg-[var(--bg-2)] text-sm" onClick={downloadDb}>
          Download DB
        </button>
      </div>

      <div className="text-xs opacity-70">
        {data ? (
          <>
            rows {data.offset + 1}-{Math.min(data.offset + data.limit, data.total)} of {data.total}
          </>
        ) : (
          "Loading…"
        )}
      </div>

      <div className="overflow-auto rounded border border-[var(--border)]">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-[var(--bg)]">
            <tr>
              {(data?.columns || []).map((c) => (
                <th key={c} className="text-left p-2 border-b border-[var(--border)] whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((r, i) => (
              <tr key={i} className="border-b border-[var(--border)]">
                {(data?.columns || []).map((c) => (
                  <td key={c} className="p-2 align-top whitespace-nowrap">
                    {r?.[c] == null ? "" : String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
            {!data?.rows?.length ? (
              <tr>
                <td className="p-3 opacity-70" colSpan={data?.columns?.length || 1}>
                  No rows
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded bg-[var(--bg-2)] text-sm"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          Prev
        </button>
        <button
          className="px-3 py-1 rounded bg-[var(--bg-2)] text-sm"
          disabled={!data || offset + limit >= data.total}
          onClick={() => setOffset(offset + limit)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
