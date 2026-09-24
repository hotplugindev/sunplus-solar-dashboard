import { useCallback } from "react";
import type { TelemetryRange, TelemetrySample } from "@sunplus/shared";
import { usePolling } from "./usePolling";
import { api } from "../lib/api";

export function useTelemetryHistory(
  deviceId: string | undefined,
  range: TelemetryRange
) {
  const fetcher = useCallback(async (): Promise<TelemetrySample[]> => {
    if (!deviceId) return [];
    const res = await api.devices.telemetryHistory(deviceId, range);
    return res.telemetry;
  }, [deviceId, range]);

  return usePolling({ fetcher, intervalMs: 30_000, enabled: !!deviceId });
}
