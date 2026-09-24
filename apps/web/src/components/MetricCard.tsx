import type { NormalizedMetric } from "@sunplus/shared";
import { PROVIDERS } from "@sunplus/shared";
import { Zap, Sun, Battery, ArrowLeftRight } from "lucide-react";

export default function MetricCard({ metric }: { metric: NormalizedMetric }) {
  const providerInfo = PROVIDERS.find((p) => p.id === metric.provider);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{metric.sourceName}</span>
        <span className="text-xs text-gray-500">{providerInfo?.name ?? metric.provider}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-solar-400" />
          <div>
            <p className="text-xs text-gray-500">AC Power</p>
            <p className="text-sm font-bold">{metric.acPowerKw.toFixed(2)} kW</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="text-xs text-gray-500">Daily Yield</p>
            <p className="text-sm font-bold">{metric.dailyYieldKwh.toFixed(2)} kWh</p>
          </div>
        </div>
        {metric.batterySoc != null && (
          <div className="flex items-center gap-2">
            <Battery className="h-4 w-4 text-purple-400" />
            <div>
              <p className="text-xs text-gray-500">Battery SOC</p>
              <p className="text-sm font-bold">{metric.batterySoc.toFixed(0)}%</p>
            </div>
          </div>
        )}
        {metric.gridPowerKw != null && (
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-xs text-gray-500">Grid</p>
              <p className="text-sm font-bold">{metric.gridPowerKw.toFixed(2)} kW</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600">{new Date(metric.timestamp).toLocaleString()}</p>
    </div>
  );
}
