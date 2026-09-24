import type { Alert, Device, IngestResult, TelemetrySample } from "@sunplus/shared";

export interface DeviceWithTelemetry {
  device: Device;
  telemetry: TelemetrySample | null;
}

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
  devices: {
    list: () => request<{ devices: Device[] }>("/api/v1/devices"),
    get: (id: string) => request<{ device: Device }>(`/api/v1/devices/${id}`),
    latestTelemetry: (id: string) =>
      request<{ telemetry: TelemetrySample }>(`/api/v1/devices/${id}/telemetry/latest`),
    listWithLatest: () =>
      request<{ devices: DeviceWithTelemetry[] }>("/api/v1/devices/latest"),
    telemetryHistory: (id: string, range: string) =>
      request<{ deviceId: string; range: string; telemetry: TelemetrySample[] }>(
        `/api/v1/devices/${id}/telemetry/history?range=${range}`
      ),
  },
  alerts: {
    list: (opts?: { deviceId?: string; unresolved?: boolean; limit?: number }) => {
      const params = new URLSearchParams();
      if (opts?.deviceId) params.set("deviceId", opts.deviceId);
      if (opts?.unresolved) params.set("unresolved", "true");
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return request<{ alerts: Alert[] }>(`/api/v1/alerts${qs ? `?${qs}` : ""}`);
    },
  },
};
