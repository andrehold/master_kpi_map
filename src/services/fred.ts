// src/services/fred.ts
// Global, rate-limited + cached FRED REST client used across the app.
// Centralizes API key handling, retries, timeouts, caching, and optional console debugging.

export type FredObservation = {
    date: string;        // YYYY-MM-DD
    value: number | null;
  };
  
  export type FredSeriesOptions = {
    observation_start?: string; // YYYY-MM-DD
    observation_end?: string;   // YYYY-MM-DD
    frequency?: string;         // "d", "w", "m", ...
    units?: string;             // "lin", "chg", "ch1", "pch", ...
    sort_order?: "asc" | "desc";
    limit?: number;             // default 10_000
  };
  
  // Minimal shape of FRED /series/observations response
  type FredObservationsResponse = {
    observations?: Array<{
      date: string;
      value: string; // FRED returns values as strings, "." for missing
      [k: string]: any;
    }>;
    [k: string]: any;
  };
  
  // Use Vite dev proxy in development to avoid CORS; fall back to absolute in prod
  const FRED_BASE =
    typeof import.meta !== "undefined" && (import.meta as any).env?.DEV
      ? "/fred" // configure Vite dev proxy for this in vite.config.ts
      : "https://api.stlouisfed.org/fred";
  
  // Expect an API key in env (rename if you prefer another key name)
  const FRED_API_KEY: string =
    (typeof import.meta !== "undefined" &&
      ((import.meta as any).env?.VITE_FRED_API_KEY as string)) ||
    "";
  
  // ---------- Debug logging (toggle at runtime) --------------------------------
  // Turn on in DevTools at any time:
  //   window.__FRED_DEBUG__ = true
  // Or persist across reloads:
  //   localStorage.setItem('fredDebug','1')
  function isDbg(): boolean {
    try {
      if (typeof window !== "undefined") {
        const w = window as any;
        if (w.__FRED_DEBUG__ === true) return true;
        if (window.localStorage?.getItem("fredDebug") === "1") return true;
      }
    } catch {}
    return false;
  }
  function flog(...args: any[]) {
    if (isDbg()) {
      try {
        console.log("[fred]", ...args);
      } catch {}
    }
  }
  function fgroup(label: string, collapsed = true) {
    if (!isDbg()) return;
    try {
      (collapsed ? console.groupCollapsed : console.group).call(
        console,
        `[fred] ${label}`,
      );
    } catch {}
  }
  function fgroupEnd() {
    if (isDbg()) {
      try {
        console.groupEnd();
      } catch {}
    }
  }
  
  // ---------- Small utils ------------------------------------------------------
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  
  function buildQuery(params: Record<string, any>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      qs.set(k, String(v));
    }
    return qs.toString();
  }
  
  // ---------- Rate limiter (global gate) --------------------------------------
  class RateGate {
    private maxPerSec: number;
    private concurrency: number;
    private running = 0;
    private queue: Array<() => void> = [];
    private starts: number[] = []; // request start timestamps (ms)
    private wakeTimer: any | null = null; // timer to re-check queue when blocked
  
    constructor(maxPerSec: number, concurrency: number) {
      this.maxPerSec = Math.max(1, maxPerSec);
      this.concurrency = Math.max(1, concurrency);
    }
  
    private canStart() {
      const now = Date.now();
      while (this.starts.length && now - this.starts[0] > 1000) {
        this.starts.shift();
      }
      return (
        this.running < this.concurrency && this.starts.length < this.maxPerSec
      );
    }
  
    private tryStartNext() {
      flog("gate: tryStartNext q=", this.queue.length, "running=", this.running);
      if (!this.queue.length) return;
      if (!this.canStart()) {
        // If we're blocked by rate window or concurrency but have nothing running
        // to trigger the next check, schedule a wake-up to re-evaluate shortly.
        if (this.wakeTimer == null) {
          const delayMs = 150; // small heartbeat to drain the queue when tokens free up
          this.wakeTimer = setTimeout(() => {
            this.wakeTimer = null;
            this.tryStartNext();
          }, delayMs);
        }
        return;
      }
      const next = this.queue.shift()!;
      this.running++;
      this.starts.push(Date.now());
      flog("gate: start task, running=", this.running);
      next();
    }
  
    async schedule<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const run = async () => {
          try {
            const result = await fn();
            resolve(result);
          } catch (e) {
            reject(e);
          } finally {
            this.running--;
            flog("gate: end task, running=", this.running);
            this.tryStartNext();
          }
        };
        this.queue.push(run);
        flog("gate: enqueued, q=", this.queue.length);
        this.tryStartNext();
      });
    }
  }
  
  // FRED limit is generous (~120 req/min), this is conservative.
  const limiter = new RateGate(/* maxPerSec */ 10, /* concurrency */ 2);
  
  // ---------- Caches + inflight coalescing ------------------------------------
  type CacheEntry<T> = { at: number; data: T };
  
  const SERIES_TTL = 5 * 60_000; // 5 minutes – daily data, so plenty
  
  const seriesCache = new Map<string, CacheEntry<FredObservation[]>>();
  const inflight = new Map<string, Promise<any>>();
  
  // ---------- Low-level GET with timeout + retry/backoff ----------------------
  export async function fget<T>(
    path: string,
    params: Record<string, any>,
  ): Promise<T> {
    if (!FRED_API_KEY) {
      throw new Error(
        "FRED API key missing – set VITE_FRED_API_KEY in your environment",
      );
    }
  
    const qs = buildQuery({
      ...params,
      api_key: FRED_API_KEY,
      file_type: "json",
    });
  
    const url = `${FRED_BASE}${path}?${qs}`;
  
    fgroup(`fget ${path}`);
    flog("params", params);
  
    return limiter.schedule(async () => {
      let delay = 300; // initial backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        flog("fetch attempt", attempt);
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 15_000); // 15s timeout
  
        try {
          const res = await fetch(url, { signal: ctrl.signal });
          if (res.ok) {
            flog("response", res.status, res.statusText);
            const json = (await res.json()) as T;
            fgroupEnd();
            return json;
          }
  
          const is429 = res.status === 429 || res.status === 503;
          if (attempt === 3 || !is429) {
            flog("error", res.status, res.statusText);
            fgroupEnd();
            throw new Error(`FRED error ${res.status}: ${res.statusText}`);
          }
          // soft rate-limit or transient – retry with backoff
          await sleep(delay);
          delay = Math.min(delay * 2, 2000);
        } catch (e) {
          // retry on network error or abort
          if (attempt === 3) {
            fgroupEnd();
            throw e;
          }
          await sleep(delay);
          delay = Math.min(delay * 2, 2000);
        }
      }
      fgroupEnd();
      throw new Error("unreachable");
    });
  }
  
  // ---------- High-level helpers ----------------------------------------------
  
  /**
   * Fetch a time series from FRED /series/observations and map to numeric values.
   *
   * @param seriesId FRED series_id, e.g. "VIXCLS"
   * @param opts     Optional filters (start/end, frequency, units, etc.)
   */
  export async function getSeriesObservations(
    seriesId: string,
    opts: FredSeriesOptions = {},
  ): Promise<FredObservation[]> {
    const key = JSON.stringify({
      seriesId,
      observation_start: opts.observation_start ?? "",
      observation_end: opts.observation_end ?? "",
      frequency: opts.frequency ?? "",
      units: opts.units ?? "",
      sort_order: opts.sort_order ?? "asc",
      limit: opts.limit ?? 10_000,
    });
  
    const now = Date.now();
    const cached = seriesCache.get(key);
    if (cached && now - cached.at < SERIES_TTL) {
      flog("getSeriesObservations: cache hit", key);
      return cached.data;
    }
  
    const running = inflight.get(key) as
      | Promise<FredObservation[]>
      | undefined;
    if (running) {
      flog("getSeriesObservations: join inflight", key);
      return running;
    }
  
    flog("getSeriesObservations: network fetch", { seriesId, opts });
  
    const p: Promise<FredObservation[]> = (async () => {
      try {
        const resp = await fget<FredObservationsResponse>(
          "/series/observations",
          {
            series_id: seriesId,
            observation_start: opts.observation_start,
            observation_end: opts.observation_end,
            frequency: opts.frequency,
            units: opts.units,
            sort_order: opts.sort_order ?? "asc",
            limit: opts.limit ?? 10_000,
          },
        );
  
        const raw = Array.isArray(resp.observations)
          ? resp.observations
          : [];
  
        const data: FredObservation[] = raw.map((o) => {
          const v = parseFloat(o.value);
          const value = Number.isFinite(v) ? v : null; // "." or NaN -> null
          return { date: o.date, value };
        });
  
        seriesCache.set(key, { at: Date.now(), data });
        return data;
      } finally {
        inflight.delete(key);
      }
    })();
  
    inflight.set(key, p);
    return p;
  }
  
  /**
   * Convenience helper: fetch just the latest observation for a series.
   * Uses FRED's sort_order=desc + limit=1.
   */
  export async function getLatestObservation(
    seriesId: string,
    opts: Omit<FredSeriesOptions, "sort_order" | "limit"> = {},
  ): Promise<FredObservation | null> {
    const obs = await getSeriesObservations(seriesId, {
      ...opts,
      sort_order: "desc",
      limit: 1,
    });
    return obs[0] ?? null;
  }
  