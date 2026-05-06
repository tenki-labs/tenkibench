"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#1A4DFF", "#0F0F12", "#6E6E76", "#22a06b", "#d93025", "#ff8a00", "#7c3aed"];

export function TimeseriesChart({
  data,
  modelKeys,
}: {
  data: Array<Record<string, number | string>>;
  modelKeys: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E2" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 1]} tickFormatter={(n) => `${(n * 100).toFixed(0)}%`} />
        <Tooltip
          formatter={(value) => `${((Number(value) || 0) * 100).toFixed(1)}%`}
          contentStyle={{ background: "#fff", border: "1px solid #E2E2E2", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {modelKeys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={1.5}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
