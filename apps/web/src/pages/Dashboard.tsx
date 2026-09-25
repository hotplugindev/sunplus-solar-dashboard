import { useCallback } from "react";
import type { NormalizedMetric } from "@sunplus/shared";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import MetricCard from "../components/MetricCard";
import { Activity, Sun, Zap, Battery } from "lucide-react";

export default function Dashboard() {
  const fetcher = useCallback(async (): Promise<NormalizedMetric[]> => {
    const res = await api.public.metrics();
    return res.metrics;
  }, []);

  const { data: metrics, loading } = usePolling({ fetcher, intervalMs: 15_000 });

  const totalPower = metrics?.reduce((sum, m) => sum + m.acPowerKw, 0) ?? 0;
  const totalYield = metrics?.reduce((sum, m) => sum + m.dailyYieldKwh, 0) ?? 0;
  const batterySources = metrics?.filter((m) => m.batterySoc != null) ?? [];
  const avgBattery = batterySources.length > 0
    ? batterySources.reduce((sum, m) => sum + (m.batterySoc ?? 0), 0) / batterySources.length
    : null;

  const stats = [
    { label: "Total AC Power", value: `${totalPower.toFixed(2)} kW`, icon: Zap, color: "text-solar-400" },
    { label: "Total Daily Yield", value: `${totalYield.toFixed(2)} kWh`, icon: Sun, color: "text-emerald-400" },
    { label: "Sources Active", value: String(metrics?.length ?? 0), icon: Activity, color: "text-blue-400" },
    { label: "Avg Battery SOC", value: avgBattery != null ? `${avgBattery.toFixed(0)}%` : "N/A", icon: Battery, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading metrics...</div>
      ) : metrics && metrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={`${metric.provider}:${metric.sourceId}`} metric={metric} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No metrics available yet. Configure sources in Settings.
        </div>
      )}
    </div>
  );
}
