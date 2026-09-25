import { useState, useEffect } from "react";
import type { TelemetryRange } from "@sunplus/shared";
import { useSources } from "../hooks/useSources";
import { useTelemetryHistory } from "../hooks/useTelemetryHistory";
import MetricsChart from "../components/MetricsChart";
import { SkeletonChart } from "../components/Skeletons";
import { Download } from "lucide-react";
import { api } from "../lib/api";

const ranges: TelemetryRange[] = ["1h", "6h", "24h", "7d", "30d"];

export default function Analytics() {
  const { data: sources } = useSources();
  const [selectedSource, setSelectedSource] = useState<number | undefined>(undefined);
  const [range, setRange] = useState<TelemetryRange>("24h");

  useEffect(() => {
    if (!selectedSource && sources && sources.length > 0) {
      setSelectedSource(sources[0]!.id);
    }
  }, [sources, selectedSource]);

  const sourceId = selectedSource;
  const { data: history, loading } = useTelemetryHistory(sourceId, range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={sourceId ?? ""}
            onChange={(e) => setSelectedSource(Number(e.target.value))}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="" disabled>Select a source...</option>
            {sources?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  range === r ? "bg-solar-500 text-gray-900" : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {sourceId && (
            <a
              href={api.metrics.exportCsv(sourceId, range)}
              download
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors"
            >
              <Download className="h-3 w-3" /> CSV
            </a>
          )}
        </div>
      </div>

      {!sourceId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <p className="text-gray-500 text-sm">Select a source to view analytics.</p>
        </div>
      ) : loading && !history ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricsChart data={history ?? []} dataKey="acPowerKw" color="#f59e0b" title="AC Power Output" unit="kW" />
          <MetricsChart data={history ?? []} dataKey="dailyYieldKwh" color="#10b981" title="Daily Yield" unit="kWh" />
        </div>
      )}
    </div>
  );
}
