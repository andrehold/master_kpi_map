// src/lib/atmIv.ts
import {
    getInstruments,
    getIndexPrice,
    getTicker,
    type DeribitInstrument,
  } from "../services/deribit";
  import { selectExpiriesByHorizon } from "./selectExpiries";
  
  export type AtmSelection = "curated" | "all";
  
  export type IVPoint = {
    expiryTs: number;
    expiryISO: string;
    dteDays: number;
    iv: number;               // decimal (e.g., 0.452 = 45.2%)
    strikeCall?: number;
    strikePut?: number;
    callName?: string;
    putName?: string;
  };
  
  export type BuildAtmIvOptions = {
    currency?: "BTC" | "ETH";
    // Shared guardrails
    minDteHours?: number;     // skip expiries expiring within N hours (default 12)
    bandPct?: number;         // restrict candidate strikes to ±bandPct of spot (optional)
  
    // Selection mode
    selection?: AtmSelection; // default "curated"
  
    // Curated mode options
    maxExpiries?: number;     // default 8
    nearDays?: number;        // default 14 (how many near weeklies to keep)
  
    // "All" mode options
    minDteDays?: number;      // default 2
    maxDteDays?: number;      // default 400
    maxAllExpiries?: number;  // safety cap, default 48
  
    // Optional overrides to avoid duplicate network fetches
    instruments?: DeribitInstrument[];
    spotIndexPrice?: number | null;
  
    // Abort support
    signal?: AbortSignal;
  };
  
  export type BuildAtmIvResult = {
    asOf: number;             // ms epoch
    indexPrice: number | null;
    points: IVPoint[];
  };
  
  const DAY_MS = 86_400_000;
  
  function asDecimalIv(x: number | undefined): number | undefined {
    if (typeof x !== "number" || !isFinite(x) || x <= 0) return undefined;
    // Deribit mark_iv is already decimal (0.452 = 45.2%)
    return x;
  }
  
  export async function buildAtmIvPoints(opts: BuildAtmIvOptions = {}): Promise<BuildAtmIvResult> {
    const {
      currency = "BTC",
      minDteHours = 12,
      bandPct = 0,
  
      selection = "curated",
  
      maxExpiries = 8,
      nearDays = 14,
  
      minDteDays = 2,
      maxDteDays = 400,
      maxAllExpiries = 48,
  
      instruments: instrumentsOverride,
      spotIndexPrice: spotOverride,
      signal,
    } = opts;
  
    const now = Date.now();
  
    // 1) Fetch spot + instruments (unless provided)
    const [spot, instruments] = await Promise.all([
      spotOverride !== undefined ? Promise.resolve(spotOverride) : getIndexPrice(currency),
      instrumentsOverride !== undefined ? Promise.resolve(instrumentsOverride) : getInstruments(currency),
    ]);
    if (signal?.aborted) return { asOf: now, indexPrice: spot ?? null, points: [] };
  
    // 2) Group options by expiry, filter too-near
    const groups = new Map<number, DeribitInstrument[]>();
    for (const ins of instruments ?? []) {
      if (ins?.kind !== "option") continue;
      const ts = ins?.expiration_timestamp;
      if (typeof ts !== "number" || ts <= 0) continue;
      if (minDteHours > 0 && (ts - now) < minDteHours * 3600 * 1000) continue;
      const arr = groups.get(ts);
      if (arr) arr.push(ins);
      else groups.set(ts, [ins]);
    }
  
    // 3) Choose expiries
    let expiries: number[];
    if (selection === "all") {
      const sortedTs = Array.from(groups.keys()).sort((a, b) => a - b);
      const filtered = sortedTs.filter(ts => {
        const dteDays = (ts - now) / DAY_MS;
        return dteDays >= Math.max(0, minDteDays) && dteDays <= Math.max(minDteDays, maxDteDays);
      });
      expiries = filtered.slice(0, Math.max(1, maxAllExpiries));
    } else {
      // curated: keep near weeklies, collapse far to last-of-month
      expiries = selectExpiriesByHorizon(groups, { maxExpiries, nearDays });
    }
  
    // 4) Build ATM IV points per expiry
    const points: IVPoint[] = [];
    const refSpot = spot ?? 0;
  
    for (const ts of expiries) {
      const list = groups.get(ts);
      if (!list || list.length === 0) continue;
  
      // Split calls/puts
      let calls = list.filter(i => i.option_type === "call");
      let puts  = list.filter(i => i.option_type === "put");
      if (!calls.length && !puts.length) continue;
  
      // Optional band around spot (±bandPct)
      if (bandPct && bandPct > 0 && isFinite(refSpot) && refSpot > 0) {
        const lo = refSpot * (1 - bandPct);
        const hi = refSpot * (1 + bandPct);
        const cBand = calls.filter(i => (i.strike! >= lo && i.strike! <= hi));
        const pBand = puts .filter(i => (i.strike! >= lo && i.strike! <= hi));
        if (cBand.length || pBand.length) {
          calls = cBand; puts = pBand;
        }
      }
  
      // Nearest by absolute distance to spot
      calls.sort((a, b) => Math.abs((a.strike! - refSpot)) - Math.abs((b.strike! - refSpot)));
      puts .sort((a, b) => Math.abs((a.strike! - refSpot)) - Math.abs((b.strike! - refSpot)));
  
      const call = calls[0];
      const put  = puts[0];
  
      let ivC: number | undefined;
      let ivP: number | undefined;
  
      // Fetch up to two tickers per expiry
      if (call) {
        const tk = await getTicker(call.instrument_name);
        if (signal?.aborted) return { asOf: now, indexPrice: spot ?? null, points: [] };
        ivC = asDecimalIv(tk?.mark_iv);
      }
      if (put) {
        const tk = await getTicker(put.instrument_name);
        if (signal?.aborted) return { asOf: now, indexPrice: spot ?? null, points: [] };
        ivP = asDecimalIv(tk?.mark_iv);
      }
  
      const atmIv = ivC != null && ivP != null ? (ivC + ivP) / 2 : (ivC ?? ivP);
      if (atmIv == null) continue;
  
      points.push({
        expiryTs: ts,
        expiryISO: new Date(ts).toISOString(),
        dteDays: (ts - now) / DAY_MS,
        iv: atmIv,
        strikeCall: call?.strike,
        strikePut:  put?.strike,
        callName:   call?.instrument_name,
        putName:    put?.instrument_name,
      });
    }
  
    points.sort((a, b) => a.expiryTs - b.expiryTs);
  
    return { asOf: now, indexPrice: spot ?? null, points };
  }