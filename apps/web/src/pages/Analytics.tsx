import { useState } from "react";
import { useDevices } from "../hooks/useDevices";
import { useTelemetryHistory } from "../hooks/useTelemetryHistory";
import PowerChart from "../components/PowerChart";
import type { TelemetryRange } from "@sunplus/shared";

const ranges: TelemetryRange[] = ["1h", "6h", "24h", "7d", "30d"];

export default function Analytics() {
  const { data: devices } = useDevices();
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [range, setRange] = useState<TelemetryRange>("24h");

  const deviceId = selectedDevice || devices?.[0]?.id;
  const { data: history, loading } = useTelemetryHistory(deviceId, range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-3">
          <select
            value={deviceId ?? ""}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          >
            {devices?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-solar-500 text-gray-900"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading telemetry history...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PowerChart
            data={history ?? []}
            dataKey="powerOutputKw"
            color="#f59e0b"
            title="Power Output"
            unit="kW"
          />
          <PowerChart
            data={history ?? []}
            dataKey="voltage"
            color="#3b82f6"
            title="Voltage"
            unit="V"
          />
          <PowerChart
            data={history ?? []}
            dataKey="temperatureC"
            color="#ef4444"
            title="Temperature"
            unit="°C"
          />
          <PowerChart
            data={history ?? []}
            dataKey="efficiencyPct"
            color="#10b981"
            title="Efficiency"
            unit="%"
          />
        </div>
      )}
    </div>
  );
}
