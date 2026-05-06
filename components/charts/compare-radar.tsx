"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = ["#1A4DFF", "#0F0F12", "#22a06b", "#d93025"];

export function CompareRadarChart({
  data,
  modelNames,
}: {
  data: Array<Record<string, string | number>>;
  modelNames: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
        <PolarGrid stroke="#E2E2E2" />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 1]} tickFormatter={(n) => `${(n * 100).toFixed(0)}%`} />
        {modelNames.map((name, i) => (
          <Radar
            key={name}
            name={name}
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.12}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => `${((Number(value) || 0) * 100).toFixed(1)}%`}
          contentStyle={{ background: "#fff", border: "1px solid #E2E2E2", fontSize: 12 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
