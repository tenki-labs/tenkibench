"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CategoryBarChart({
  data,
}: {
  data: Array<{ name: string; score: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 28)}>
      <BarChart layout="vertical" data={data} margin={{ left: 80, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E2" />
        <XAxis type="number" domain={[0, 1]} tickFormatter={(n) => `${(n * 100).toFixed(0)}%`} />
        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => `${((Number(value) || 0) * 100).toFixed(1)}%`}
          contentStyle={{ background: "#fff", border: "1px solid #E2E2E2", fontSize: 12 }}
        />
        <Bar dataKey="score" fill="#1A4DFF" radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
}
