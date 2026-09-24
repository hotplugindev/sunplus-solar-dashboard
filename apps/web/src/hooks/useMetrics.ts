import { useCallback } from "react";
import type { NormalizedMetric } from "@sunplus/shared";
import { usePolling } from "./usePolling";
import { api } from "../lib/api";

export function useMetrics() {
  const fetcher = useCallback(async (): Promise<NormalizedMetric[]> => {
    const res = await api.metrics.cached();
    return res.metrics;
  }, []);

  return usePolling({ fetcher, intervalMs: 15_000 });
}
