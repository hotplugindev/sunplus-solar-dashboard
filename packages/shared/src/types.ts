export type ProviderId = "huawei" | "sungrow" | "solaredge" | "sma" | "fronius" | "sigenergy";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  app: string;
  implemented: boolean;
  requiredFields: string[];
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "huawei", name: "Huawei", app: "FusionSolar", implemented: true, requiredFields: ["Username", "Password"] },
  { id: "sungrow", name: "Sungrow", app: "iSolarCloud", implemented: true, requiredFields: ["App ID", "API Key", "Device Serial Number"] },
  { id: "solaredge", name: "SolarEdge", app: "mySolarEdge", implemented: true, requiredFields: ["API Key", "Site IDs"] },
  { id: "sma", name: "SMA", app: "SMA Energy", implemented: true, requiredFields: ["Client ID", "Client Secret", "Login Hint Email"] },
  { id: "fronius", name: "Fronius", app: "Solar.web", implemented: true, requiredFields: ["Access Key ID", "Access Key Value", "PV System IDs"] },
  { id: "sigenergy", name: "Sigenergy", app: "mySigenergy", implemented: false, requiredFields: [] },
];

export interface ProviderAuthData {
  username?: string;
  password_hash?: string;
  api_key?: string;
  oauth_client_id?: string;
  oauth_client_secret?: string;
  extra_config?: Record<string, string>;
}

export interface Source {
  id: number;
  name: string;
  provider: ProviderId;
  config: Record<string, string>;
  isActive: boolean;
  pollIntervalMinutes: number;
  lastPolledAt: string | null;
  lastError: string | null;
  createdAt: string;
  consecutiveFailures: number;
  circuitState: "closed" | "open" | "half-open";
  lastViewedAt: string | null;
}

export interface NormalizedMetric {
  sourceId: number;
  sourceName: string;
  provider: ProviderId;
  acPowerKw: number;
  dailyYieldKwh: number;
  batterySoc: number | null;
  gridPowerKw: number | null;
  timestamp: string;
}

export type TelemetryRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface TelemetrySample {
  sourceId: number;
  acPowerKw: number;
  dailyYieldKwh: number;
  batterySoc: number | null;
  gridPowerKw: number | null;
  timestamp: string;
}

export interface PollMetric {
  sourceId: number;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface SystemHealth {
  status: "ok" | "degraded" | "down";
  db: boolean;
  kv: boolean;
  sourcesTotal: number;
  sourcesActive: number;
  sourcesHealthy: number;
  lastCronRun: string | null;
  timestamp: string;
}
