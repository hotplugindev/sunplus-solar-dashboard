import type { DeviceStatus } from "@sunplus/shared";

export function formatKw(value: number): string {
  return `${value.toFixed(2)} kW`;
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatTemp(value: number): string {
  return `${value.toFixed(1)}°C`;
}

export function statusColor(status: DeviceStatus): string {
  switch (status) {
    case "online":
      return "text-emerald-400";
    case "degraded":
      return "text-amber-400";
    case "offline":
      return "text-red-400";
    case "maintenance":
      return "text-blue-400";
  }
}

export function statusBg(status: DeviceStatus): string {
  switch (status) {
    case "online":
      return "bg-emerald-500";
    case "degraded":
      return "bg-amber-500";
    case "offline":
      return "bg-red-500";
    case "maintenance":
      return "bg-blue-500";
  }
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
