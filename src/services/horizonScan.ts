// src/services/horizonScan.ts
// Horizon (EM) Entry Scanner — Deribit BTC (USD-aware) — uses existing deribit.ts client

import {
    getIndexPrice,
    getInstruments,
    getTicker,
    type DeribitInstrument,
    type Currency,
  } from "./deribit";
  
  // ============== Config (match your notebook) ==============
  export const HORIZON_CFG = {
    CURRENCY: "BTC" as Currency,
    TARGET_DTE: 14,
    DTE_MIN: 7,
    DTE_MAX: 21,
  
    SHORT_EM_MULT: 1.0,  // short strikes at ± EM * this
    K_HEDGE: 1.6,        // long hedges at ± EM * this
  
    MIN_CREDIT_USD: 50.0, // condor credit floor
    MAX_BA_FRAC: 0.05,    // per-leg bid/ask fraction of mid
  };
  
  // ============== Types ==============
  export interface HorizonRow {
    underlying: Currency;
    spot_usd: number;
    dte: number;
    EM_usd: number;
    EM_pct: number;
    atm_strike: number | null;
    atm_call_mid_usd: number | null;
    atm_put_mid_usd: number | null;
    short_put_K: number;
    long_put_K: number;
    short_call_K: number;
    long_call_K: number;
    sp_name: string | null;
    lp_name: string | null;
    sc_name: string | null;
    lc_name: string | null;
    sp_mid_usd: number | null;
    lp_mid_usd: number | null;
    sc_mid_usd: number | null;
    lc_mid_usd: number | null;
    credit_mid_usd: number;
    max_loss_usd: number;
    width_put_usd: number;
    width_call_usd: number;
    liquidity_ok: boolean;
    passes: boolean;
  }
  
  // ============== Helpers ==============
  function midFromBest(bid?: number, ask?: number, last?: number): number | null {
    if (ask && ask > 0) return bid ? (bid + ask) / 2 : ask;
    if (last && last > 0) return last;
    return null;
  }
  
  function utcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  
  function daysBetweenUTC(aMs: number, bMs: number) {
    const DAY = 86_400_000;
    return Math.floor((aMs - bMs) / DAY);
  }
  
  function pickChainNearDte(
    instruments: DeribitInstrument[],
    targetDte = HORIZON_CFG.TARGET_DTE,
    dteMin = HORIZON_CFG.DTE_MIN,
    dteMax = HORIZON_CFG.DTE_MAX,
  ) {
    const today = utcDateOnly(new Date()).getTime();
    const buckets = new Map<number, DeribitInstrument[]>();
  
    for (const ins of instruments) {
      if (ins.kind !== "option") continue;
      const dte = daysBetweenUTC(ins.expiration_timestamp, today);
      if (dte < dteMin || dte > dteMax) continue;
      const arr = buckets.get(ins.expiration_timestamp) ?? [];
      arr.push(ins);
      buckets.set(ins.expiration_timestamp, arr);
    }
  
    if (!buckets.size) return { chain: [] as DeribitInstrument[], dte: -1 };
  
    const arr = [...buckets.entries()]
      .map(([ts, list]) => ({ ts, list, dte: daysBetweenUTC(ts, today) }))
      .sort((a, b) => Math.abs(a.dte - targetDte) - Math.abs(b.dte - targetDte));
  
    return { chain: arr[0].list, dte: arr[0].dte };
  }
  
  async function expectedMoveFromAtmUSD(chain: DeribitInstrument[], spot_usd: number) {
    const strikes = Array.from(new Set(chain.map(c => c.strike).filter((x): x is number => typeof x === "number"))).sort((a,b)=>a-b);
    if (!strikes.length) return { EM_usd: null as number | null, atm: null, call_atm: null, put_atm: null, c_mid_usd: null, p_mid_usd: null };
  
    const atm = strikes.reduce((best, s) => Math.abs(s - spot_usd) < Math.abs(best - spot_usd) ? s : best, strikes[0]);
    const call = chain.find(c => c.option_type === "call" && c.strike === atm);
    const put  = chain.find(c => c.option_type === "put"  && c.strike === atm);
    if (!call || !put) return { EM_usd: null, atm, call_atm: null, put_atm: null, c_mid_usd: null, p_mid_usd: null };
  
    const cTk = await getTicker(call.instrument_name);
    const pTk = await getTicker(put.instrument_name);
    const cMidBtc = midFromBest(cTk.best_bid_price, cTk.best_ask_price, cTk.last_price);
    const pMidBtc = midFromBest(pTk.best_bid_price, pTk.best_ask_price, pTk.last_price);
  
    const c_mid_usd = cMidBtc != null ? cMidBtc * spot_usd : null;
    const p_mid_usd = pMidBtc != null ? pMidBtc * spot_usd : null;
    const EM_usd = (c_mid_usd != null && p_mid_usd != null) ? (c_mid_usd + p_mid_usd) : null;
  
    return { EM_usd, atm, call_atm: call.instrument_name, put_atm: put.instrument_name, c_mid_usd, p_mid_usd };
  }
  
  function baOk(mid_usd: number | null, bid_btc: number | null | undefined, ask_btc: number | null | undefined, spot_usd: number) {
    if (mid_usd == null || bid_btc == null || ask_btc == null || ask_btc <= 0) return false;
    const spread_usd = (ask_btc - bid_btc) * spot_usd;
    const denom = Math.max(Math.abs(mid_usd), 1e-6);
    return spread_usd / denom <= HORIZON_CFG.MAX_BA_FRAC;
  }
  
  function pickNearestName(chain: DeribitInstrument[], optType: "call" | "put", strikeTarget: number) {
    let best: string | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const c of chain) {
      if (c.option_type !== optType) continue;
      const d = Math.abs((c.strike ?? 0) - strikeTarget);
      if (d < bestD) { bestD = d; best = c.instrument_name; }
    }
    return best;
  }
  
  // ============== Main scan ==============
  export async function scanHorizonBTCUSD(): Promise<HorizonRow[]> {
    const spot_usd = await getIndexPrice(HORIZON_CFG.CURRENCY); // USD
    const instruments = await getInstruments(HORIZON_CFG.CURRENCY);
  
    const { chain, dte } = pickChainNearDte(instruments, HORIZON_CFG.TARGET_DTE, HORIZON_CFG.DTE_MIN, HORIZON_CFG.DTE_MAX);
    if (!chain.length) return [];
  
    const em = await expectedMoveFromAtmUSD(chain, spot_usd);
    if (em.EM_usd == null || !Number.isFinite(em.EM_usd)) return [];
  
    // EM-based iron condor
    const sp_K = spot_usd - HORIZON_CFG.SHORT_EM_MULT * em.EM_usd;
    const lp_K = spot_usd - HORIZON_CFG.K_HEDGE       * em.EM_usd;
    const sc_K = spot_usd + HORIZON_CFG.SHORT_EM_MULT * em.EM_usd;
    const lc_K = spot_usd + HORIZON_CFG.K_HEDGE       * em.EM_usd;
  
    const sp_name = pickNearestName(chain, "put",  sp_K);
    const lp_name = pickNearestName(chain, "put",  lp_K);
    const sc_name = pickNearestName(chain, "call", sc_K);
    const lc_name = pickNearestName(chain, "call", lc_K);
  
    const [sp, lp, sc, lc] = await Promise.all(
      [sp_name, lp_name, sc_name, lc_name].map(async (nm) => {
        if (!nm) return { mid_usd: null, bid_btc: null, ask_btc: null };
        const t = await getTicker(nm);
        const mid_btc = midFromBest(t.best_bid_price, t.best_ask_price, t.last_price);
        const mid_usd = mid_btc != null ? mid_btc * spot_usd : null;
        return { mid_usd, bid_btc: t.best_bid_price ?? null, ask_btc: t.best_ask_price ?? null };
      })
    );
  
    const credit_usd = (sp.mid_usd ?? NaN) - (lp.mid_usd ?? NaN) + (sc.mid_usd ?? NaN) - (lc.mid_usd ?? NaN);
    const width_put_usd  = Math.abs(sp_K - lp_K);
    const width_call_usd = Math.abs(lc_K - sc_K);
    const max_loss_usd   = Math.max(width_put_usd, width_call_usd) - credit_usd;
  
    const liq_ok = [
      baOk(sp.mid_usd, sp.bid_btc, sp.ask_btc, spot_usd),
      baOk(lp.mid_usd, lp.bid_btc, lp.ask_btc, spot_usd),
      baOk(sc.mid_usd, sc.bid_btc, sc.ask_btc, spot_usd),
      baOk(lc.mid_usd, lc.bid_btc, lc.ask_btc, spot_usd),
    ].every(Boolean);
  
    const row: HorizonRow = {
      underlying: HORIZON_CFG.CURRENCY,
      spot_usd,
      dte,
      EM_usd: em.EM_usd!,
      EM_pct: em.EM_usd! / spot_usd,
      atm_strike: em.atm ?? null,
      atm_call_mid_usd: em.c_mid_usd ?? null,
      atm_put_mid_usd: em.p_mid_usd ?? null,
      short_put_K: sp_K,
      long_put_K: lp_K,
      short_call_K: sc_K,
      long_call_K: lc_K,
      sp_name, lp_name, sc_name, lc_name,
      sp_mid_usd: sp.mid_usd ?? null,
      lp_mid_usd: lp.mid_usd ?? null,
      sc_mid_usd: sc.mid_usd ?? null,
      lc_mid_usd: lc.mid_usd ?? null,
      credit_mid_usd: credit_usd,
      max_loss_usd,
      width_put_usd,
      width_call_usd,
      liquidity_ok: liq_ok,
      passes: Number.isFinite(credit_usd) && credit_usd >= HORIZON_CFG.MIN_CREDIT_USD && liq_ok,
    };
  
    return [row];
  }
  
  // ============== CSV helpers ==============
  export function horizonRowsToCSV(rows: HorizonRow[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]) as (keyof HorizonRow)[];
    const esc = (v: any) => {
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map(h => esc((r as any)[h])).join(","));
    return lines.join("\n");
  }
  
  export function downloadCSV(csv: string, filename = "horizon_candidates_btc.csv") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  
  // ============== One-click (scan + download) ==============
  export async function runHorizonScanAndDownload() {
    const rows = await scanHorizonBTCUSD();
    const csv = horizonRowsToCSV(rows);
    downloadCSV(csv);
    return rows;
  }
  