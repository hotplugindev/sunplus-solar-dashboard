import { useCallback } from "react";
import type { TelemetrySample } from "@sunplus/shared";
import { usePolling } from "./usePolling";
import { api } from "../lib/api";

export function useDeviceTelemetry(deviceId: string | undefined) {
  const fetcher = useCallback(async (): Promise<TelemetrySample | null> => {
    if (!deviceId) return null;
    try {
      const res = await api.devices.latestTelemetry(deviceId);
      return res.telemetry;
    } catch {
      return null;
    }
  }, [deviceId]);

  return usePolling({ fetcher, intervalMs: 5_000, enabled: !!deviceId });
}
