import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { useDeviceTelemetry } from "../hooks/useDeviceTelemetry";
import { useTelemetryHistory } from "../hooks/useTelemetryHistory";
import { useAlerts } from "../hooks/useAlerts";
import { api } from "../lib/api";
import TelemetryCard from "../components/TelemetryCard";
import PowerChart from "../components/PowerChart";
import AlertFeed from "../components/AlertFeed";
import { statusColor, timeAgo } from "../lib/utils";

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();

  const fetchDevice = useCallback(async () => {
    if (!id) return null;
    const res = await api.devices.get(id);
    return res.device;
  }, [id]);

  const { data: device } = usePolling({ fetcher: fetchDevice, intervalMs: 15_000, enabled: !!id });
  const { data: telemetry } = useDeviceTelemetry(id);
  const { data: history } = useTelemetryHistory(id, "24h");
  const { data: alerts } = useAlerts({ deviceId: id, limit: 20 });

  if (!device) {
    return <div className="text-gray-500">Loading device...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{device.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {device.siteLocation} ·{" "}
          <span className={statusColor(device.status)}>{device.status}</span> · Last
          seen {timeAgo(device.lastSeenAt)}
        </p>
      </div>

      {telemetry && <TelemetryCard telemetry={telemetry} />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <PowerChart
            data={history ?? []}
            dataKey="powerOutputKw"
            color="#f59e0b"
            title="Power Output (24h)"
            unit="kW"
          />
          <PowerChart
            data={history ?? []}
            dataKey="temperatureC"
            color="#ef4444"
            title="Temperature (24h)"
            unit="°C"
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Alerts</h2>
          <AlertFeed alerts={alerts ?? []} />
        </div>
      </div>
    </div>
  );
}
