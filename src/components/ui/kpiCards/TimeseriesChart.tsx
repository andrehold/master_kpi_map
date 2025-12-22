// ui/kpiCards/TimeseriesChart.tsx
import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Placeholder Image for loading state
const PlaceholderImage = () => (
  <div className="w-full h-64 bg-gray-300 text-center text-gray-700 flex items-center justify-center">
    Loading chart...
  </div>
);

const TimeseriesChart = ({ kpiId }: { kpiId: string }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/timeseries?kpiId=${kpiId}`);
        const result = await response.json();
        setData(result);
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
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="ts" tickFormatter={(tick) => new Date(tick).toLocaleTimeString()} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TimeseriesChart;
