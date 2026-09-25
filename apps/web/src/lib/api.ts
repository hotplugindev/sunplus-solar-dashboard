import type { NormalizedMetric, Source, TelemetrySample, ProviderAuthData } from "@sunplus/shared";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export function getToken(): string | null {
  return localStorage.getItem("dashboard_token");
}

export function setToken(token: string): void {
  localStorage.setItem("dashboard_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("dashboard_token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    clearToken();
    window.dispatchEvent(new Event("auth:logout"));
  }

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
  setup: {
    status: () => request<{ setupComplete: boolean }>("/api/v1/setup/status"),
    initialize: (data: { admin_password: string; dashboard_password: string }) =>
      request<{ status: string }>("/api/v1/setup/initialize", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { password: string; role: string }) =>
      request<{ token: string; role: string }>("/api/v1/setup/login", { method: "POST", body: JSON.stringify(data) }),
  },
  sources: {
    list: () => request<{ sources: Source[] }>("/api/v1/sources"),
    get: (id: number) => request<{ source: Source; auth: any }>(`/api/v1/sources/${id}`),
    create: (data: { name: string; provider: string; config: Record<string, string>; pollIntervalMinutes: number; auth?: ProviderAuthData }) =>
      request<{ source: Source }>("/api/v1/sources", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<{ source: Source }>(`/api/v1/sources/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ success: boolean }>(`/api/v1/sources/${id}`, { method: "DELETE" }),
    updateAuth: (id: number, auth: ProviderAuthData) =>
      request<{ success: boolean }>(`/api/v1/sources/${id}/auth`, { method: "PUT", body: JSON.stringify(auth) }),
  },
  metrics: {
    fetch: () => request<{ metrics: NormalizedMetric[]; timestamp: string }>("/api/v1/metrics"),
    cached: () => request<{ metrics: NormalizedMetric[]; timestamp: string | null }>("/api/v1/metrics/cached"),
    history: (sourceId: number, range: string) =>
      request<{ sourceId: number; range: string; telemetry: TelemetrySample[] }>(
        `/api/v1/metrics/${sourceId}/history?range=${range}`
      ),
  },
  public: {
    metrics: () => request<{ metrics: NormalizedMetric[]; timestamp: string }>("/api/v1/public/metrics"),
  },
};
