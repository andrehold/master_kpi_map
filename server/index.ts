import express from "express";
import cors from "cors";
import { db } from "./db";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT ?? 8787);

function newRunId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function stripRuntimeFields(snapshot: any) {
  // store run_id + ts in columns; keep JSON payload stable
  const copy = { ...snapshot };
  delete copy.runId;
  delete copy.ts;
  return copy;
}

// health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// start a run
app.post("/api/runs/start", (req, res) => {
  const id = newRunId();
  const startedAt = Date.now();
  const currency = req.body?.currency ?? "BTC";

  db.prepare(`INSERT INTO runs (id, started_at, currency) VALUES (?, ?, ?)`).run(
    id,
    startedAt,
    currency
  );

  res.json({ runId: id, startedAt, currency });
});

// end a run
app.post("/api/runs/end", (req, res) => {
  const { runId } = req.body ?? {};
  if (!runId) return res.status(400).json({ error: "runId required" });

  db.prepare(`UPDATE runs SET ended_at = ? WHERE id = ?`).run(Date.now(), runId);
  res.json({ ok: true });
});

// append to time series + update latest cache
app.post("/api/snapshots", (req, res) => {
  const snapshot = req.body;
  if (!snapshot?.runId || !snapshot?.kpiId) {
    return res.status(400).json({ error: "runId and kpiId required" });
  }

  const runId = snapshot.runId;
  const kpiId = snapshot.kpiId;
  const ts = snapshot.ts ?? Date.now();
  const status = snapshot.status ?? "ready";

  const payload = stripRuntimeFields({ ...snapshot, status });
  const payloadJson = JSON.stringify(payload);

  const mainValue =
    payload?.main && typeof payload.main.value === "number" && Number.isFinite(payload.main.value)
      ? payload.main.value
      : null;

  // optional dedupe: if newest event has identical payload, skip inserting another
  const last = db
    .prepare(
      `SELECT snapshot_json FROM snapshot_events
       WHERE run_id = ? AND kpi_id = ?
       ORDER BY ts DESC
       LIMIT 1`
    )
    .get(runId, kpiId) as { snapshot_json: string } | undefined;

  if (!last || last.snapshot_json !== payloadJson) {
    db.prepare(
      `INSERT INTO snapshot_events (run_id, kpi_id, ts, status, main_value, snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(runId, kpiId, ts, status, mainValue, payloadJson);
  }

  // keep latest cache for fast reads
  db.prepare(`
    INSERT INTO snapshots (run_id, kpi_id, ts, status, main_value, snapshot_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(run_id, kpi_id) DO UPDATE SET
      ts = excluded.ts,
      status = excluded.status,
      main_value = excluded.main_value,
      snapshot_json = excluded.snapshot_json
  `).run(runId, kpiId, ts, status, mainValue, payloadJson);

  res.json({ ok: true });
});

// latest run + latest snapshot per KPI (from cache table)
app.get("/api/runs/latest/snapshots", (_req, res) => {
  const run = db.prepare(`SELECT * FROM runs ORDER BY started_at DESC LIMIT 1`).get() as any;
  if (!run) return res.json({ run: null, snapshots: [] });

  const rows = db
    .prepare(`SELECT kpi_id, ts, status, snapshot_json FROM snapshots WHERE run_id = ?`)
    .all(run.id) as Array<any>;

  const snapshots = rows.map((r) => {
    const payload = JSON.parse(r.snapshot_json);
    return {
      runId: run.id,
      kpiId: r.kpi_id,
      ts: r.ts,
      status: r.status,
      ...payload,
    };
  });

  res.json({ run, snapshots });
});

// time series for a run (optionally filter by kpiId, sinceTs, limit)
app.get("/api/runs/:runId/series", (req, res) => {
  const { runId } = req.params;
  const kpiId = typeof req.query.kpiId === "string" ? req.query.kpiId : null;
  const sinceTs = typeof req.query.sinceTs === "string" ? Number(req.query.sinceTs) : null;
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 5000;

  const where: string[] = ["run_id = ?"];
  const args: any[] = [runId];

  if (kpiId) {
    where.push("kpi_id = ?");
    args.push(kpiId);
  }
  if (Number.isFinite(sinceTs as any)) {
    where.push("ts >= ?");
    args.push(sinceTs);
  }

  const sql = `
    SELECT kpi_id, ts, status, snapshot_json
    FROM snapshot_events
    WHERE ${where.join(" AND ")}
    ORDER BY ts ASC
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(...args, limit) as Array<any>;
  const events = rows.map((r) => ({
    runId,
    kpiId: r.kpi_id,
    ts: r.ts,
    status: r.status,
    ...JSON.parse(r.snapshot_json),
  }));

  res.json({ runId, events });
});

// export CSV for time series (events)
app.get("/api/runs/:runId/export.csv", (req, res) => {
  const { runId } = req.params;

  const rows = db
    .prepare(
      `SELECT kpi_id, ts, status, snapshot_json
       FROM snapshot_events
       WHERE run_id = ?
       ORDER BY ts ASC`
    )
    .all(runId) as Array<any>;

  const lines: string[] = [];
  lines.push(["runId", "kpiId", "ts", "status", "pointKey", "label", "value", "formatted"].join(","));

  for (const r of rows) {
    const payload = JSON.parse(r.snapshot_json);

    const base = [runId, r.kpi_id, String(r.ts), String(r.status)];
    const main = payload.main ? [payload.main] : [];
    const mini = Array.isArray(payload.mini) ? payload.mini : [];

    for (const p of [...main, ...mini]) {
      const row = [
        ...base,
        p.key ?? "",
        p.label ?? "",
        String(p.value ?? ""),
        String(p.formatted ?? "").replaceAll('"', '""'),
      ];
      lines.push(row.map((v) => `"${String(v)}"`).join(","));
    }
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(lines.join("\n"));
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

// Fetch timeseries for a specific KPI (filtered by runId)
app.get("/api/timeseries", (req, res) => {
  const { kpiId, limit = 100, runId } = req.query;

  if (!kpiId || !runId) {
    return res.status(400).json({ error: "Missing kpiId or runId" });
  }

  try {
    const query = `
      SELECT 
        ts,
        json_extract(snapshot_json, '$.main.value') AS value,
        json_extract(snapshot_json, '$.main.formatted') AS formatted
      FROM snapshots
      WHERE kpi_id = ?
        AND run_id = ?
      ORDER BY ts DESC
      LIMIT ?;
    `;
    
    const rows = db.prepare(query).all(kpiId, runId, limit);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error querying timeseries data" });
  }
});