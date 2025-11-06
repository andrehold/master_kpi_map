// src/hooks/useDeribitFunding.ts
import { useEffect, useState } from "react";
import { dget } from "../services/deribit"; // same helper you use for index price

type Point = { timestamp: number; interest_1h: number; interest_8h: number };

export function useDeribitFunding(instrument = "BTC-PERPETUAL") {
  const [state, setState] = useState<{
    current8h?: number;
    avg7d8h?: number;
    zScore?: number;
    updatedAt?: number;
    error?: string;
    loading: boolean;
  }>({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const now = Date.now();
        const start = now - 7 * 24 * 60 * 60 * 1000;

        // 1) History for last 7 days (hourly + rolling 8h)
        const hist = await dget<{ result: Point[] }>(
          "/public/get_funding_rate_history",
          { instrument_name: instrument, start_timestamp: start, end_timestamp: now }
        );
        const series = hist?.result ?? [];

        // 2) Current/predicted 8h funding
        const cur = await dget<{
          result: { interest_8h: number; data: { interest_8h: number; timestamp: number }[] };
        }>("/public/get_funding_chart_data", { instrument_name: instrument, length: "8h" });

        const current8h =
          cur?.result?.interest_8h ??
          (series.length ? series[series.length - 1].interest_8h : undefined);

        // 7d average: mean of last 168 hourly rates, then scale to 8h
        const hourly = series.slice(-168).map(p => p.interest_1h);
        const avg1h = hourly.length ? hourly.reduce((a, b) => a + b, 0) / hourly.length : undefined;
        const avg7d8h = avg1h !== undefined ? avg1h * 8 : undefined;

        // z-score vs 7d 8h series
        const eightH = series.map(p => p.interest_8h);
        const mean8h = eightH.length ? eightH.reduce((a, b) => a + b, 0) / eightH.length : 0;
        const sd8h =
          eightH.length > 1
            ? Math.sqrt(
                eightH.reduce((s, x) => s + (x - mean8h) ** 2, 0) / (eightH.length - 1)
              )
            : undefined;
        const zScore =
          current8h !== undefined && sd8h && sd8h > 0 ? (current8h - mean8h) / sd8h : undefined;

        setState({ current8h, avg7d8h, zScore, updatedAt: now, loading: false });
      } catch (e: any) {
        setState({ loading: false, error: String(e) });
      }
    })();
  }, [instrument]);

  return state;
}
