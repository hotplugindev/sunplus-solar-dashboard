import { useCallback } from "react";
import type { Alert } from "@sunplus/shared";
import { usePolling } from "./usePolling";
import { api } from "../lib/api";

interface UseAlertsOptions {
  deviceId?: string;
  unresolved?: boolean;
  limit?: number;
}

export function useAlerts(opts?: UseAlertsOptions) {
  const fetcher = useCallback(async (): Promise<Alert[]> => {
    const res = await api.alerts.list(opts);
    return res.alerts;
  }, [opts?.deviceId, opts?.unresolved, opts?.limit]);

  return usePolling({ fetcher, intervalMs: 15_000 });
}
