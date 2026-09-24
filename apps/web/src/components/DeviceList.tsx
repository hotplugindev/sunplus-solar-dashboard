import type { Device } from "@sunplus/shared";
import { Zap } from "lucide-react";
import { statusBg } from "../lib/utils";

interface Props {
  devices: Device[];
}

export default function DeviceList({ devices }: Props) {
  if (devices.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No devices registered yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {devices.map((device) => (
        <a
          key={device.id}
          href={`/devices/${device.id}`}
          className="block rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-solar-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm truncate">{device.name}</h3>
            <span className={`h-2.5 w-2.5 rounded-full ${statusBg(device.status)}`} />
          </div>
          <p className="text-xs text-gray-500 mb-2">{device.siteLocation}</p>
          <div className="flex items-center gap-1.5 text-solar-400">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">{device.capacityKw} kW capacity</span>
          </div>
        </a>
      ))}
    </div>
  );
}
