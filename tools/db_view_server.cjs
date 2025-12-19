// tools/db_view_server.js
/* eslint-disable no-console */
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const PORT = Number(process.env.PORT || 8787);
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), "data", "snapshots.db");

function csvEscape(v) {
  if (v == null) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  // escape quotes by doubling
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(columns, rows) {
  const header = columns.map(csvEscape).join(",") + "\n";
  const body = rows
    .map((r) => columns.map((c) => csvEscape(r[c])).join(","))
    .join("\n");
  return header + body + (rows.length ? "\n" : "");
}

function assertDbExists() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`DB not found at ${DB_PATH}`);
  }
}

function openDb() {
  assertDbExists();
  return new Database(DB_PATH, { readonly: true, fileMustExist: true });
}

function listTables(db) {
  return db
    .prepare(
      `
      SELECT name, type
      FROM sqlite_master
      WHERE type IN ('table','view')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY type, name;
    `.trim()
    )
    .all();
}

function isValidIdentifier(name) {
  // strict: letters/numbers/underscore only (avoids injection)
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

const app = express();
app.use(cors());

// health
app.get("/api/db/health", (_req, res) => {
  try {
    const db = openDb();
    db.close();
    res.json({ ok: true, dbPath: DB_PATH });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// list tables
app.get("/api/db/tables", (_req, res) => {
  const db = openDb();
  try {
    res.json({ tables: listTables(db) });
  } finally {
    db.close();
  }
});

// query table rows
app.get("/api/db/table/:name", (req, res) => {
  const name = req.params.name;

  if (!isValidIdentifier(name)) {
    return res.status(400).json({ error: "Invalid table name" });
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 2000);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  const orderBy = String(req.query.orderBy || "");
  const orderDir = String(req.query.orderDir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const db = openDb();
  try {
    // Ensure table exists
    const allowed = new Set(listTables(db).map((t) => t.name));
    if (!allowed.has(name)) return res.status(404).json({ error: "Table not found" });

    // column info
    const cols = db.prepare(`PRAGMA table_info(${name});`).all();
    const columns = cols.map((c) => c.name);

    // safe-ish ordering: only allow ordering by existing columns
    let orderClause = "";
    if (orderBy && columns.includes(orderBy)) {
      orderClause = ` ORDER BY ${orderBy} ${orderDir}`;
    }

    const total = db.prepare(`SELECT COUNT(*) AS n FROM ${name};`).get().n;

    const rows = db
      .prepare(`SELECT * FROM ${name}${orderClause} LIMIT ? OFFSET ?;`)
      .all(limit, offset);

    res.json({ table: name, columns, rows, total, limit, offset });
  } finally {
    db.close();
  }
});

// download table as CSV
app.get("/api/db/table/:name.csv", (req, res) => {
  const name = req.params.name;

  if (!isValidIdentifier(name)) {
    return res.status(400).send("Invalid table name");
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 50000), 1), 200000);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const db = openDb();
  try {
    const allowed = new Set(listTables(db).map((t) => t.name));
    if (!allowed.has(name)) return res.status(404).send("Table not found");

    const cols = db.prepare(`PRAGMA table_info(${name});`).all();
    const columns = cols.map((c) => c.name);

    const rows = db.prepare(`SELECT * FROM ${name} LIMIT ? OFFSET ?;`).all(limit, offset);

    const csv = toCsv(columns, rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}.csv"`);
    res.send(csv);
  } finally {
    db.close();
  }
});

// download raw db
app.get("/api/db/download", (_req, res) => {
  try {
    assertDbExists();
    res.setHeader("Content-Type", "application/x-sqlite3");
    res.setHeader("Content-Disposition", 'attachment; filename="snapshots.db"');
    fs.createReadStream(DB_PATH).pipe(res);
  } catch (e) {
    res.status(500).send(String(e?.message || e));
  }
});

app.listen(PORT, () => {
  console.log(`[db_view_server] listening on http://localhost:${PORT}`);
  console.log(`[db_view_server] db path: ${DB_PATH}`);
});
