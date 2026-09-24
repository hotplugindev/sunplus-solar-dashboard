export type DeviceStatus = "online" | "degraded" | "offline" | "maintenance";
export type AlertSeverity = "info" | "warning" | "critical";

export interface Device {
  id: string;
  name: string;
  siteLocation: string;
  capacityKw: number;
  status: DeviceStatus;
  installedAt: string;
  lastSeenAt: string | null;
}

export interface TelemetrySample {
  deviceId: string;
  voltage: number;
  current: number;
  powerOutputKw: number;
  temperatureC: number;
  efficiencyPct: number;
  timestamp: string;
}

export interface TelemetryIngestPayload {
  deviceId: string;
  voltage: number;
  current: number;
  temperatureC: number;
  efficiencyPct: number;
}

export interface Alert {
  id: number;
  deviceId: string;
  severity: AlertSeverity;
  message: string;
  isResolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export type TelemetryRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface IngestResult {
  accepted: boolean;
  deviceId: string;
  powerOutputKw: number;
  alertsCreated: number;
}

export const ALERT_THRESHOLDS = {
  temperatureC: 65.0,
  efficiencyPct: 80.0,
} as const;
