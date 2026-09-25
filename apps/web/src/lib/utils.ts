import type { ProviderId } from "@sunplus/shared";

export function formatKw(value: number): string {
  return `${value.toFixed(2)} kW`;
}

export function formatKwh(value: number): string {
  return `${value.toFixed(2)} kWh`;
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function providerLabel(provider: ProviderId): string {
  const labels: Record<ProviderId, string> = {
    huawei: "Huawei FusionSolar",
    sungrow: "Sungrow iSolarCloud",
    solaredge: "SolarEdge",
    sma: "SMA Energy",
    fronius: "Fronius Solar.web",
    sigenergy: "Sigenergy",
  };
  return labels[provider];
}

export function providerColor(provider: ProviderId): string {
  const colors: Record<ProviderId, string> = {
    huawei: "text-red-400",
    sungrow: "text-blue-400",
    solaredge: "text-orange-400",
    sma: "text-purple-400",
    fronius: "text-emerald-400",
    sigenergy: "text-cyan-400",
  };
  return colors[provider];
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
