import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { CheckCircle, XCircle, AlertTriangle, Database, HardDrive } from "lucide-react";

interface HealthData {
  status: string;
  db: boolean;
  kv: boolean;
  sourcesTotal: number;
  sourcesActive: number;
  sourcesHealthy: number;
  timestamp: string;
}

export default function Status() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.health.check();
      setHealth(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch health status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading && !health) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Status</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-900 rounded-xl border border-gray-800" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-900 rounded-xl border border-gray-800" />
            <div className="h-20 bg-gray-900 rounded-xl border border-gray-800" />
            <div className="h-20 bg-gray-900 rounded-xl border border-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  const statusColor = health?.status === "ok" ? "text-emerald-400" : health?.status === "degraded" ? "text-amber-400" : "text-red-400";
  const StatusIcon = health?.status === "ok" ? CheckCircle : health?.status === "degraded" ? AlertTriangle : XCircle;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Status</h1>
        <button onClick={fetchHealth} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Refresh</button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 flex items-center gap-4">
        <StatusIcon className={`h-10 w-10 ${statusColor}`} />
        <div>
          <p className={`text-lg font-bold capitalize ${statusColor}`}>{health?.status ?? "unknown"}</p>
          <p className="text-xs text-gray-500">Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : "N/A"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center gap-3">
          <Database className={`h-5 w-5 ${health?.db ? "text-emerald-400" : "text-red-400"}`} />
          <div>
            <p className="text-sm font-medium">Database (D1)</p>
            <p className={`text-xs ${health?.db ? "text-emerald-400" : "text-red-400"}`}>{health?.db ? "Connected" : "Unavailable"}</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center gap-3">
          <HardDrive className={`h-5 w-5 ${health?.kv ? "text-emerald-400" : "text-red-400"}`} />
          <div>
            <p className="text-sm font-medium">Cache (KV)</p>
            <p className={`text-xs ${health?.kv ? "text-emerald-400" : "text-red-400"}`}>{health?.kv ? "Connected" : "Unavailable"}</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-sm font-medium mb-1">Sources</p>
          <p className="text-xs text-gray-400">{health?.sourcesHealthy ?? 0} healthy / {health?.sourcesActive ?? 0} active / {health?.sourcesTotal ?? 0} total</p>
        </div>
      </div>
    </div>
  );
}
