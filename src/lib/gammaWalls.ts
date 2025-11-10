// lib/gammaWalls.ts
import { getIndexPrice, getInstruments, getTicker, getBookSummaryByCurrency } from '../services/deribit';

export type GammaByStrike = {
  strike: number;
  gex_call_usd: number;
  gex_put_usd: number;
  gex_net_usd: number;
  gex_abs_usd: number;
};

export async function buildGammaByStrike(currency: 'BTC'|'ETH', opts?: {
  windowPct?: number;   // e.g. 0.1 => ±10% around spot
  maxExpiries?: number; // limit expiries to keep runtime reasonable
}) {
  const windowPct = opts?.windowPct ?? 0.1;

  const [spot, instruments, oiMap] = await Promise.all([
    getIndexPrice(currency),
    getInstruments(currency),
    getBookSummaryByCurrency(currency),
  ]);

  // keep options near spot
  const near = instruments.filter(i =>
    i.kind === 'option' &&
    typeof i.strike === 'number' &&
    Math.abs(i.strike! - spot) / spot <= windowPct
  );

  // fetch gamma via ticker (rate gate in deribit.ts will coalesce)
  const rows: Array<{ strike:number; gamma:number; oi:number; isCall:boolean; }> = [];
  for (const i of near) {
    const t = await getTicker(i.instrument_name); // includes greeks.gamma
    const gamma = t?.greeks?.gamma;
    const oi = oiMap.get(i.instrument_name) ?? 0;
    if (typeof gamma === 'number' && isFinite(gamma) && oi > 0) {
      rows.push({ strike: i.strike!, gamma, oi, isCall: i.option_type === 'call' });
    }
  }

  // aggregate to USD gamma exposure per strike: gamma * S^2 * OI * contractSize(=1)
  const byStrike = new Map<number, { call:number; put:number }>();
  for (const r of rows) {
    const usdGamma = r.gamma * spot * spot * r.oi; // contractSize assumed 1
    const rec = byStrike.get(r.strike) ?? { call:0, put:0 };
    if (r.isCall) rec.call += usdGamma; else rec.put += usdGamma;
    byStrike.set(r.strike, rec);
  }

  const out: GammaByStrike[] = [];
  for (const [strike, {call, put}] of byStrike) {
    const net = call - put; // sign convention: calls – puts
    out.push({
      strike,
      gex_call_usd: call,
      gex_put_usd:  put,
      gex_net_usd:  net,
      gex_abs_usd:  Math.abs(net), // or use |call|+|put| if you prefer
    });
  }
  return out.sort((a,b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
}
