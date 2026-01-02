// ui/kpiCards/TimeseriesChart.tsx
// ui/kpiCards/TimeseriesChart.tsx
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Placeholder Image for loading state
const PlaceholderImage = () => (
  <div className="w-full h-64 bg-gray-300 text-center text-gray-700 flex items-center justify-center">
    Loading chart...
  </div>
);

type RawPoint = { ts: number | string; value: any; [k: string]: any };
type ChartPoint = { day: string; ts: number; value: any };

function toTsMs(ts: number | string): number {
  return typeof ts === "number" ? ts : Date.parse(ts);
}

// Europe/Berlin day key (YYYY-MM-DD), stable + sortable
const dayKeyBerlin = (() => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (tsMs: number) => fmt.format(new Date(tsMs)); // "YYYY-MM-DD"
})();

function latestPerDayAscending(points: RawPoint[]): ChartPoint[] {
  const byDay = new Map<string, ChartPoint>();

  for (const p of points ?? []) {
    const tsMs = toTsMs(p.ts);
    const day = dayKeyBerlin(tsMs);

    const prev = byDay.get(day);
    if (!prev || tsMs > prev.ts) {
      byDay.set(day, { day, ts: tsMs, value: p.value });
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.ts - b.ts);
}

const TimeseriesChart = ({ kpiId }: { kpiId: string }) => {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/timeseries?kpiId=${kpiId}`);
        const result = (await response.json()) as RawPoint[];
        setData(latestPerDayAscending(result));
      } catch (error) {
        console.error("Error fetching timeseries data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [kpiId]);

  if (loading) return <PlaceholderImage />;

  const axisTick = { fontSize: 10 };
  const tooltipStyle = { fontSize: 10 };
  const legendStyle = { fontSize: 10 };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tick={axisTick}
          tickFormatter={(day) => {
            // day is "YYYY-MM-DD"
            const d = new Date(`${day}T00:00:00`);
            return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
          }}
        />
        <YAxis tick={axisTick} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(day) => {
            const d = new Date(`${day}T00:00:00`);
            return d.toLocaleDateString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "2-digit",
            });
          }}
        />
        <Legend wrapperStyle={legendStyle} />
        <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TimeseriesChart;
