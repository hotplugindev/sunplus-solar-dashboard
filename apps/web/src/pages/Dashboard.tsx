import { useCallback, useEffect } from "react";
import type { NormalizedMetric } from "@sunplus/shared";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import MetricCard from "../components/MetricCard";
import { SkeletonCard, SkeletonStat } from "../components/Skeletons";
import { Activity, Sun, Zap, Battery, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const fetcher = useCallback(async (): Promise<NormalizedMetric[]> => {
    const res = await api.public.metrics();
    return res.metrics;
  }, []);

  const { data: metrics, loading, error, refetch, isStale } = usePolling({ fetcher, intervalMs: 60_000 });

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("manual:refresh", handler);
    return () => window.removeEventListener("manual:refresh", handler);
  }, [refetch]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {isStale && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Using stale data
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !metrics
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : stats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
      </div>

      {error && metrics && (
        <div className="rounded-lg border border-amber-800 bg-amber-950 px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to refresh metrics. Showing last known data.
        </div>
      )}

      {loading && !metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : metrics && metrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={`${metric.provider}:${metric.sourceId}`} metric={metric} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Sun className="h-12 w-12 text-gray-700" />
          <p className="text-gray-500 text-sm">No metrics available yet.</p>
          <p className="text-gray-600 text-xs">Configure sources in Settings to start monitoring.</p>
        </div>
      )}
    </div>
  );
}
