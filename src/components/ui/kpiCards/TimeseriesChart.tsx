import React, { useState, useEffect, Suspense } from "react";

// Lazy-load the Recharts renderer so recharts ships in a separate chunk
const TimeseriesChartRecharts = React.lazy(() => import("./TimeseriesChartRecharts"));

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

  return (
    <Suspense fallback={<PlaceholderImage />}>
      <TimeseriesChartRecharts data={data} />
    </Suspense>
  );
};

export default TimeseriesChart;
