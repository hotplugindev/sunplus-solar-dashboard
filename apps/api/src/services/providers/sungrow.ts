import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter, ProviderAuth } from "./types";
import { sungrowAuthSchema, sungrowDataSchema } from "../validation";

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
      throw new Error(`Sungrow auth failed: ${tokenRes.status} ${tokenRes.statusText}`);
    }

    const tokenRaw = await tokenRes.json();
    const tokenParsed = sungrowAuthSchema.safeParse(tokenRaw);
    if (!tokenParsed.success || tokenParsed.data.code !== "0" || !tokenParsed.data.data?.token) {
      throw new Error("Sungrow auth returned invalid response");
    }

    const token = tokenParsed.data.data.token;

    const metricsRes = await fetch(`${BASE_URL}/v1/device/realtime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceSn }),
    });

    if (!metricsRes.ok) {
      throw new Error(`Sungrow realtime error: ${metricsRes.status} ${metricsRes.statusText}`);
    }

    const metricsRaw = await metricsRes.json();
    const metricsParsed = sungrowDataSchema.safeParse(metricsRaw);
    if (!metricsParsed.success || metricsParsed.data.code !== "0" || !metricsParsed.data.data) {
      throw new Error("Sungrow returned invalid data");
    }

    const d = metricsParsed.data.data;
    const rawGridPower = d.gridPower;
    const normalizedGridPower = rawGridPower != null ? -rawGridPower / 1000 : null;

    return [
      {
        sourceId: 0,
        sourceName: "",
        provider: "sungrow" as const,
        acPowerKw: (d.activePower ?? 0) / 1000,
        dailyYieldKwh: (d.dailyYield ?? 0) / 1000,
        batterySoc: d.batterySoc ?? null,
        gridPowerKw: normalizedGridPower,
        timestamp: new Date(d.collectTime ?? Date.now()).toISOString(),
      },
    ];
  },
};
