// src/lib/atmIv.ts
import {
  getInstruments,
  getIndexPrice,
  getTicker,
  type DeribitInstrument,
} from "../services/deribit";
import { pickNearestStrike, normalizeDeribitIv } from "./deribitOptionMath";
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

  // Guardrails
  minDteHours?: number;     // default 12
  bandPct?: number;         // optional ±band around spot

  // Selection mode
  selection?: AtmSelection; // default "curated"

  // Curated mode options
  maxExpiries?: number;     // default 8
  nearDays?: number;        // default 14

  // "All" mode options
  minDteDays?: number;      // default 2
  maxDteDays?: number;      // default 400
  maxAllExpiries?: number;  // default 48

  // Optional fetch overrides
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

  // 1) Spot + instruments (or overrides)
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
    const call = pickNearestStrike(calls, refSpot);
    const put  = pickNearestStrike(puts, refSpot);

    // Fetch up to two tickers per expiry
    let ivC = call ? normalizeDeribitIv((await getTicker(call.instrument_name))?.mark_iv) ?? null : null;
    if (signal?.aborted) return { asOf: now, indexPrice: spot ?? null, points: [] };
    let ivP = put  ? normalizeDeribitIv((await getTicker(put .instrument_name))?.mark_iv) ?? null : null;
    if (signal?.aborted) return { asOf: now, indexPrice: spot ?? null, points: [] };

    // Average IV if both sides present; otherwise take whichever exists
    let atmIv: number | null = null;
    if (ivC != null && ivP != null) atmIv = (ivC + ivP) / 2;
    else atmIv = ivC ?? ivP;

    // Final sanity: keep only plausible 0–500% annualized
    if (atmIv == null || !isFinite(atmIv) || atmIv <= 0 || atmIv >= 5) continue;

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
