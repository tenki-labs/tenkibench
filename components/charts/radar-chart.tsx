"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export function ModelRadarChart({
  data,
  modelName,
}: {
  data: Array<{ category: string; score: number }>;
  modelName: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="#E2E2E2" />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 1]} tickFormatter={(n) => `${(n * 100).toFixed(0)}%`} />
        <Radar
          name={modelName}
          dataKey="score"
          stroke="#1A4DFF"
          fill="#1A4DFF"
          fillOpacity={0.18}
        />
        <Tooltip
          formatter={(value) => `${((Number(value) || 0) * 100).toFixed(1)}%`}
          contentStyle={{ background: "#fff", border: "1px solid #E2E2E2", fontSize: 12 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
