import { useCallback } from "react";
import type { Device } from "@sunplus/shared";
import { usePolling } from "./usePolling";
import { api } from "../lib/api";

export function useDevices() {
  const fetcher = useCallback(async (): Promise<Device[]> => {
    const res = await api.devices.list();
    return res.devices;
  }, []);

  return usePolling({ fetcher, intervalMs: 15_000 });
}
