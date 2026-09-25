import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TelemetrySample } from "@sunplus/shared";

interface MetricsChartProps {
  data: TelemetrySample[];
  dataKey: keyof TelemetrySample;
  color: string;
  title: string;
  unit: string;
}

export default function MetricsChart({ data, dataKey, color, title, unit }: MetricsChartProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">No data for this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v: string) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              stroke="#4b5563"
            />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} stroke="#4b5563" unit={` ${unit}`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
              labelFormatter={(v: string) => new Date(v).toLocaleString()}
              formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, title]}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
