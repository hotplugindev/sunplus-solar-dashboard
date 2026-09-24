import type { TelemetrySample } from "@sunplus/shared";
import { Thermometer, Zap, Gauge, Droplets } from "lucide-react";
import { formatKw, formatPct, formatTemp } from "../lib/utils";

interface Props {
  telemetry: TelemetrySample;
}

export default function TelemetryCard({ telemetry }: Props) {
  const metrics = [
    {
      label: "Power Output",
      value: formatKw(telemetry.powerOutputKw),
      icon: Zap,
      color: "text-solar-400",
    },
    {
      label: "Voltage",
      value: `${telemetry.voltage.toFixed(1)} V`,
      icon: Gauge,
      color: "text-blue-400",
    },
    {
      label: "Temperature",
      value: formatTemp(telemetry.temperatureC),
      icon: Thermometer,
      color: telemetry.temperatureC > 65 ? "text-red-400" : "text-emerald-400",
    },
    {
      label: "Efficiency",
      value: formatPct(telemetry.efficiencyPct),
      icon: Droplets,
      color: telemetry.efficiencyPct < 80 ? "text-amber-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-xl border border-gray-800 bg-gray-900 p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
          </div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
