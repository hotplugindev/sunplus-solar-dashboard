import type { NormalizedMetric, Source, TelemetrySample } from "@sunplus/shared";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, errorBody.error ?? "Request failed", errorBody);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  sources: {
    list: () => request<{ sources: Source[] }>("/api/v1/sources"),
    create: (data: { name: string; provider: string; config: Record<string, string>; pollIntervalMinutes: number }) =>
      request<{ source: Source }>("/api/v1/sources", { method: "POST", body: JSON.stringify(data) }),
    toggle: (id: number, isActive: boolean) =>
      request<{ success: boolean }>(`/api/v1/sources/${id}/toggle`, { method: "POST", body: JSON.stringify({ isActive }) }),
    remove: (id: number) =>
      request<{ success: boolean }>(`/api/v1/sources/${id}`, { method: "DELETE" }),
  },
  metrics: {
    fetch: () => request<{ metrics: NormalizedMetric[]; timestamp: string }>("/api/v1/metrics"),
    cached: () => request<{ metrics: NormalizedMetric[]; timestamp: string | null }>("/api/v1/metrics/cached"),
    history: (sourceId: number, range: string) =>
      request<{ sourceId: number; range: string; telemetry: TelemetrySample[] }>(
        `/api/v1/metrics/${sourceId}/history?range=${range}`
      ),
  },
};
