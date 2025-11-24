// src/hooks/useLiquidityStress.ts
import { useEffect, useRef, useState } from 'react';
import type { Currency, DeribitInstrument } from '../../services/deribit';
import { dget, getIndexPriceMeta, getInstruments } from '../../services/deribit';

export type { Currency } from '../../services/deribit';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type OrderBookLevel = {
	price: number;
	amount: number;
};

type DeribitOrderBook = {
	best_bid_price?: number;
	best_ask_price?: number;
	mark_price?: number;
	bids?: OrderBookLevel[];
	asks?: OrderBookLevel[];
};

export type LiquidityStressMarket = {
	id: string;         // 'perp' | '3d' | '30d' | ...
	label: string;      // e.g. 'Perp', '3D expiry'
	instrument: string; // Deribit instrument_name
	dte?: number;       // days to expiry, for options
	spreadBps?: number; // bid/ask spread in bps
	depth?: number;     // depth in underlying units within ±windowPct
	stress?: number;    // 0–1 per-market stress
};

export type LiquidityStressMetrics = {
	combinedStress: number;        // 0–1, overall stress
	markets: LiquidityStressMarket[];
	avgSpreadBps?: number;
	totalDepth?: number;
	indexPrice?: number;
};

type State = {
	loading: boolean;
	error: unknown;
	metrics?: LiquidityStressMetrics;
};

export type UseLiquidityStressParams = {
	currency?: Currency;
	/** Fractional window around mid, e.g. 0.005 = ±0.5% */
	windowPct?: number;
	/** Approx size (in underlying units) you care about trading, e.g. 10 BTC */
	clipSize?: number;
	/** Polling interval in ms. Set to 0/undefined to disable polling. */
	pollMs?: number;
};

function getDeribitOptionTick(price: number): number {
  // Deribit: above 0.005 → 0.0005, below → 0.0001
  return price >= 0.005 ? 0.0005 : 0.0001;
}

function clamp(x: number, min: number, max: number) {
	if (x < min) return min;
	if (x > max) return max;
	return x;
}

/**
	* Pick an ATM-ish option in a DTE bucket for the given currency.
	* We filter by [minDte, maxDte], then sort by |DTE - targetDte| and |strike - index|.
	*/
function pickTenorOption(
	instruments: DeribitInstrument[],
	indexPrice: number | undefined,
	targetDte: number,
	minDte: number,
	maxDte: number
): DeribitInstrument | undefined {
	const now = Date.now();
	const opts = instruments
		.filter(
			(i) =>
				i.kind === 'option' &&
				i.is_active &&
				typeof i.expiration_timestamp === 'number'
		)
		.map((i) => ({
			inst: i,
			dte: (i.expiration_timestamp - now) / MS_PER_DAY,
		}))
		.filter((row) => row.dte >= minDte && row.dte <= maxDte);

	if (!opts.length) return undefined;

	opts.sort((a, b) => {
		const aD = Math.abs(a.dte - targetDte);
		const bD = Math.abs(b.dte - targetDte);
		if (
			!indexPrice ||
			typeof a.inst.strike !== 'number' ||
			typeof b.inst.strike !== 'number'
		) {
			return aD - bD;
		}
		const aK = Math.abs(a.inst.strike - indexPrice);
		const bK = Math.abs(b.inst.strike - indexPrice);
		// first by DTE, then by distance to ATM
		return aD - bD || aK - bK;
	});

	return opts[0]?.inst;
}

/**
	* React hook that computes a composite "liquidity stress" metric
	* from Deribit's order books for:
	* - Perp
	* - ~3D option expiry (2–7 DTE, closest to 3)
	* - ~30D option expiry (21–40 DTE, closest to 30)
	*/
export function useLiquidityStress(params: UseLiquidityStressParams): State {
	const {
		currency = 'BTC',
		windowPct = 0.005, // ±0.5%
		clipSize = 10,
		pollMs = 60_000,
	} = params ?? {};

	const [state, setState] = useState<State>({
		loading: true,
		error: null,
		metrics: undefined,
	});

	const pollMsRef = useRef(pollMs);
	pollMsRef.current = pollMs;

	useEffect(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;

		async function fetchOnce() {
			setState((prev) => ({ ...prev, loading: true, error: null }));

			try {
				const [indexMeta, instruments] = await Promise.all([
					getIndexPriceMeta(currency),
					getInstruments(currency),
				]);

				const indexPrice = indexMeta?.price;
				const now = Date.now();

				// Perp: BTC-PERPETUAL / ETH-PERPETUAL
				const perp = (instruments as DeribitInstrument[]).find(
					(i) =>
						i.kind === 'future' &&
						i.is_active &&
						/PERPETUAL/i.test(i.instrument_name)
				);

				// Short-dated 3D option
				const shortOpt = pickTenorOption(
					instruments as DeribitInstrument[],
					indexPrice,
					3,
					2,
					7
				);

				// 1M 30D option
				const monthOpt = pickTenorOption(
					instruments as DeribitInstrument[],
					indexPrice,
					30,
					21,
					40
				);

				const marketConfigs: {
					id: string;
					label: string;
					inst: DeribitInstrument;
				}[] = [];
				if (perp) marketConfigs.push({ id: 'perp', label: 'Perp', inst: perp });
				if (shortOpt)
					marketConfigs.push({ id: '3d', label: '3D expiry', inst: shortOpt });
				if (monthOpt)
					marketConfigs.push({ id: '30d', label: '30D expiry', inst: monthOpt });

				if (!marketConfigs.length) {
					if (!cancelled) {
						setState({ loading: false, error: null, metrics: undefined });
					}
					return;
				}

				const books = await Promise.all(
					marketConfigs.map((cfg) =>
						dget<DeribitOrderBook>('/public/get_order_book', {
							instrument_name: cfg.inst.instrument_name,
							depth: 20,
						}).catch((err) => {
							console.error(
								'get_order_book failed',
								cfg.inst.instrument_name,
								err
							);
							return null;
						})
					)
				);

				const markets: LiquidityStressMarket[] = [];

				for (let i = 0; i < marketConfigs.length; i++) {
					const cfg = marketConfigs[i];
					const ob = books[i];
					if (!ob) continue;

          const isOption = cfg.inst.kind === "option";

					const dte =
            isOption && typeof cfg.inst.expiration_timestamp === "number"
              ? (cfg.inst.expiration_timestamp - now) / MS_PER_DAY
              : undefined;

					const bid =
						ob.best_bid_price ??
						(ob.bids && ob.bids.length ? ob.bids[0].price : undefined);
					const ask =
						ob.best_ask_price ??
						(ob.asks && ob.asks.length ? ob.asks[0].price : undefined);

					const mid =
						bid && ask
							? (bid + ask) / 2
							: ask ?? bid ?? ob.mark_price ?? indexPrice;

					if (!mid || !isFinite(mid)) continue;

					// Spread in bps for reference
          const spreadBps =
          bid && ask ? ((ask - bid) / mid) * 10_000 : undefined;

          // Tick-aware spread (for options)
          let tickSize: number | undefined;
          let tickSpread: number | undefined;

          if (isOption && mid > 0) {
            tickSize = getDeribitOptionTick(mid);
            if (bid && ask && tickSize > 0) {
              tickSpread = (ask - bid) / tickSize; // e.g. 1 = 1 tick wide
            }
          }

					// Window for depth: keep perps tight, ensure options see a few ticks
          const effectiveWindowPct = isOption
          ? Math.max(windowPct, 0.03) // at least ±3% for options
          : windowPct;

					const lower = mid * (1 - effectiveWindowPct);
					const upper = mid * (1 + effectiveWindowPct);

					let depth = 0;

					if (Array.isArray(ob.bids)) {
						for (const level of ob.bids) {
							if (level.price >= lower) depth += level.amount ?? 0;
						}
					}
					if (Array.isArray(ob.asks)) {
						for (const level of ob.asks) {
							if (level.price <= upper) depth += level.amount ?? 0;
						}
					}

          // --- spread stress: tick-based for options, bps-based for perps ---

					let spreadStress = 0;

          if (isOption && tickSpread != null && isFinite(tickSpread)) {
            // Treat 1 tick as "healthy", 8+ ticks as max stress
            const normalizedTicks = (tickSpread - 1) / 7; // 1 → 0, 8 → 1
            spreadStress = clamp(normalizedTicks, 0, 1);
          } else if (spreadBps != null && isFinite(spreadBps)) {
            // Perps/futures: 0–400 bps → 0–100% stress
            spreadStress = clamp(spreadBps / 400, 0, 1);
          }

					const depthDenom = clipSize > 0 ? clipSize * 4 : 1;
					const depthRatio =
						depthDenom > 0 ? Math.min(depth / depthDenom, 1) : 1;
					const depthStress = 1 - depthRatio;

					const stress = 0.5 * spreadStress + 0.5 * depthStress;

					markets.push({
						id: cfg.id,
						label: cfg.label,
						instrument: cfg.inst.instrument_name,
						dte,
						spreadBps,
						depth,
						stress,
					});
				}

				if (!markets.length) {
					if (!cancelled) {
						setState({ loading: false, error: null, metrics: undefined });
					}
					return;
				}

				const avgSpreadBps =
					markets.reduce((sum, m) => sum + (m.spreadBps ?? 0), 0) /
					markets.length;

				const totalDepth = markets.reduce(
					(sum, m) => sum + (m.depth ?? 0),
					0
				);

				// Combined stress: 40% 3D, 40% 30D, 20% perp (if present)
				const weightsById: Record<string, number> = {
					perp: 0.2,
					'3d': 0.4,
					'30d': 0.4,
				};

				let weightSum = 0;
				for (const m of markets) {
					weightSum += weightsById[m.id] ?? 1;
				}

				const combinedStress =
					markets.reduce((sum, m) => {
						const w = weightsById[m.id] ?? 1;
						return sum + (m.stress ?? 0) * w;
					}, 0) / (weightSum || 1);

				const metrics: LiquidityStressMetrics = {
					combinedStress,
					markets,
					avgSpreadBps,
					totalDepth,
					indexPrice,
				};

				if (!cancelled) {
					setState({ loading: false, error: null, metrics });
				}
			} catch (err) {
				if (!cancelled) {
					setState((prev) => ({ ...prev, loading: false, error: err }));
				}
			} finally {
				if (!cancelled && pollMsRef.current && pollMsRef.current > 0) {
					timer = setTimeout(fetchOnce, pollMsRef.current);
				}
			}
		}

		fetchOnce();

		return () => {
			cancelled = true;
			if (timer != null) {
				clearTimeout(timer);
			}
		};
	}, [currency, windowPct, clipSize, pollMs]);

	return state;
}
