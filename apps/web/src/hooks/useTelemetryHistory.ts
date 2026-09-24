import { useCallback } from "react";
import type { TelemetryRange, TelemetrySample } from "@sunplus/shared";
import { usePolling } from "./usePolling";
import { api } from "../lib/api";

export function useTelemetryHistory(sourceId: number | undefined, range: TelemetryRange) {
  const fetcher = useCallback(async (): Promise<TelemetrySample[]> => {
    if (!sourceId) return [];
    const res = await api.metrics.history(sourceId, range);
    return res.telemetry;
  }, [sourceId, range]);

  return usePolling({ fetcher, intervalMs: 60_000, enabled: !!sourceId });
}
