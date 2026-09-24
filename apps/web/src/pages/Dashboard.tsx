import { useCallback } from "react";
import type { DeviceWithTelemetry } from "../lib/api";
import { usePolling } from "../hooks/usePolling";
import { useAlerts } from "../hooks/useAlerts";
import { api } from "../lib/api";
import DeviceList from "../components/DeviceList";
import AlertFeed from "../components/AlertFeed";
import { Activity, AlertTriangle, Sun, Zap } from "lucide-react";

export default function Dashboard() {
  const fetcher = useCallback(async (): Promise<DeviceWithTelemetry[]> => {
    const res = await api.devices.listWithLatest();
    return res.devices;
  }, []);

  const { data: devicesWithTelemetry, loading } = usePolling({ fetcher, intervalMs: 15_000 });
  const { data: alerts } = useAlerts({ unresolved: true, limit: 10 });

  const devices = devicesWithTelemetry?.map((d) => d.device) ?? [];
  const onlineCount = devices.filter((d) => d.status === "online").length;
  const totalCapacity = devices.reduce((sum, d) => sum + d.capacityKw, 0);
  const totalOutput = devicesWithTelemetry?.reduce(
    (sum, d) => sum + (d.telemetry?.powerOutputKw ?? 0),
    0
  ) ?? 0;
  const criticalAlerts = alerts?.filter((a) => a.severity === "critical").length ?? 0;

  const stats = [
    { label: "Devices Online", value: `${onlineCount}/${devices.length}`, icon: Sun, color: "text-emerald-400" },
    { label: "Live Output", value: `${totalOutput.toFixed(1)} kW`, icon: Zap, color: "text-solar-400" },
    { label: "Active Alerts", value: String(alerts?.length ?? 0), icon: AlertTriangle, color: "text-amber-400" },
    { label: "Critical", value: String(criticalAlerts), icon: Activity, color: "text-red-400" },
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Devices</h2>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading devices...</div>
          ) : (
            <DeviceList devices={devices} />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Alerts</h2>
          <AlertFeed alerts={alerts ?? []} />
        </div>
      </div>
    </div>
  );
}
