export type ProviderId = "huawei" | "sungrow" | "solaredge" | "sma" | "fronius" | "sigenergy";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  app: string;
  implemented: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "huawei", name: "Huawei", app: "FusionSolar", implemented: true },
  { id: "sungrow", name: "Sungrow", app: "iSolarCloud", implemented: true },
  { id: "solaredge", name: "SolarEdge", app: "mySolarEdge", implemented: true },
  { id: "sma", name: "SMA", app: "SMA Energy", implemented: false },
  { id: "fronius", name: "Fronius", app: "Solar.web", implemented: true },
  { id: "sigenergy", name: "Sigenergy", app: "mySigenergy", implemented: false },
];

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
