import { useCallback } from "react";
import type { Source } from "@sunplus/shared";
import { usePolling } from "./usePolling";
import { api } from "../lib/api";

export function useSources() {
  const fetcher = useCallback(async (): Promise<Source[]> => {
    const res = await api.sources.list();
    return res.sources;
  }, []);

  return usePolling({ fetcher, intervalMs: 30_000 });
}
