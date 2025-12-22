// tools/db.ts
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "kpi.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  currency TEXT
);

-- "latest cache" (one row per KPI per run)
CREATE TABLE IF NOT EXISTS snapshots (
  run_id TEXT NOT NULL,
  kpi_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  status TEXT NOT NULL,
  main_value REAL,              -- ✅ new
  snapshot_json TEXT NOT NULL,
  PRIMARY KEY (run_id, kpi_id),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_run_ts ON snapshots(run_id, ts);

-- time series table (append-only)
CREATE TABLE IF NOT EXISTS snapshot_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  kpi_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  status TEXT NOT NULL,
  main_value REAL,              -- ✅ new
  snapshot_json TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_events_run_kpi_ts
  ON snapshot_events(run_id, kpi_id, ts);
`);

// --- ✅ lightweight migration for existing DB files (CREATE TABLE IF NOT EXISTS won't add columns)
function ensureColumn(table: string, col: string, decl: string) {
  const cols = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((r: any) => r.name);

  if (!cols.includes(col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
    return true;
  }
  return false;
}

const addedSnapshots = ensureColumn("snapshots", "main_value", "REAL");
const addedEvents = ensureColumn("snapshot_events", "main_value", "REAL");

// Optional: backfill only if we just added the column (safe + fast enough for your DB size)
function extractMainValue(snapshotJson: string): number | null {
  try {
    const payload = JSON.parse(snapshotJson);
    const v = payload?.main?.value;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

if (addedSnapshots) {
  const rows = db
    .prepare(`SELECT run_id, kpi_id, snapshot_json FROM snapshots WHERE main_value IS NULL`)
    .all() as Array<any>;
  const upd = db.prepare(
    `UPDATE snapshots SET main_value = ? WHERE run_id = ? AND kpi_id = ?`
  );
  const tx = db.transaction(() => {
    for (const r of rows) upd.run(extractMainValue(r.snapshot_json), r.run_id, r.kpi_id);
  });
  tx();
}

if (addedEvents) {
  const rows = db
    .prepare(`SELECT id, snapshot_json FROM snapshot_events WHERE main_value IS NULL`)
    .all() as Array<any>;
  const upd = db.prepare(`UPDATE snapshot_events SET main_value = ? WHERE id = ?`);
  const tx = db.transaction(() => {
    for (const r of rows) upd.run(extractMainValue(r.snapshot_json), r.id);
  });
  tx();
}
