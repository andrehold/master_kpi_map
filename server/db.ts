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
  snapshot_json TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_events_run_kpi_ts
  ON snapshot_events(run_id, kpi_id, ts);
`);
