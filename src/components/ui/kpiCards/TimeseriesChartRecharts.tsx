// TimeseriesChartRecharts.tsx
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
  
  type ChartPoint = { day: string; ts: number; value: any };
  
  export default function TimeseriesChartRecharts({ data }: { data: ChartPoint[] }) {
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
  }
  