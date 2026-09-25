import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter, ProviderAuth } from "./types";

const BASE_URL = "https://isolarcloud.com/api";

export const sungrowAdapter: ProviderAdapter = {
  providerId: "sungrow",

  async poll(auth: ProviderAuth): Promise<NormalizedMetric[]> {
    const appId = auth.oauth_client_id;
    const apiKey = auth.api_key;
    const extra = JSON.parse(auth.extra_config || "{}") as Record<string, string>;
    const deviceSn = extra["deviceSn"];

    if (!appId || !apiKey || !deviceSn) {
      throw new Error("Sungrow requires oauth_client_id, api_key, and deviceSn in extra_config");
    }

    const tokenRes = await fetch(`${BASE_URL}/v1/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, apiKey }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Sungrow auth failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json() as {
      code?: string;
      data?: { token?: string };
    };

    if (tokenData.code !== "0" || !tokenData.data?.token) {
      throw new Error("Sungrow auth returned no token");
    }

    const token = tokenData.data.token;

    const metricsRes = await fetch(`${BASE_URL}/v1/device/realtime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceSn }),
    });

    if (!metricsRes.ok) {
      throw new Error(`Sungrow realtime error: ${metricsRes.status}`);
    }

    const metricsData = await metricsRes.json() as {
      code?: string;
      data?: {
        activePower?: number;
        dailyYield?: number;
        batterySoc?: number;
        gridPower?: number;
        collectTime?: string;
      };
    };

    if (metricsData.code !== "0" || !metricsData.data) {
      throw new Error("Sungrow returned no data");
    }

    const d = metricsData.data;

    return [
      {
        sourceId: 0,
        sourceName: "",
        provider: "sungrow" as const,
        acPowerKw: (d.activePower ?? 0) / 1000,
        dailyYieldKwh: (d.dailyYield ?? 0) / 1000,
        batterySoc: d.batterySoc ?? null,
        gridPowerKw: d.gridPower != null ? d.gridPower / 1000 : null,
        timestamp: d.collectTime ?? new Date().toISOString(),
      },
    ];
  },
};
