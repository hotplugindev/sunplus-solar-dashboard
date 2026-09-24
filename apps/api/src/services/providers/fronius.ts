import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter } from "./types";

const BASE_URL = "https://api.solarweb.com";

export const froniusAdapter: ProviderAdapter = {
  providerId: "fronius",

  async poll(config: Record<string, string>): Promise<NormalizedMetric[]> {
    const accessKeyId = config["accessKeyId"];
    const accessKeyValue = config["accessKeyValue"];
    const pvSystemIds = (config["pvSystemIds"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    if (!accessKeyId || !accessKeyValue || pvSystemIds.length === 0) {
      throw new Error("Fronius requires accessKeyId, accessKeyValue, and pvSystemIds in config");
    }

    const metrics: NormalizedMetric[] = [];
    const headers: Record<string, string> = {
      "pvapi-version": "2.1",
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    const tokenRes = await fetch(`${BASE_URL}/Auth/AccessTokens`, {
      method: "POST",
      headers,
      body: JSON.stringify({ accessKeyId, accessKeyValue }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Fronius auth failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json() as { accessToken: string; accessTokenType: string };
    headers["Authorization"] = `${tokenData.accessTokenType} ${tokenData.accessToken}`;

    for (const pvSystemId of pvSystemIds) {
      const flowRes = await fetch(
        `${BASE_URL}/PvSystems/${pvSystemId}/FlowData?fromDateTime=${new Date().toISOString()}&toDateTime=${new Date().toISOString()}`,
        { headers }
      );

      if (!flowRes.ok) {
        throw new Error(`Fronius flow data error for ${pvSystemId}: ${flowRes.status}`);
      }

      const flowData = await flowRes.json() as {
        aggregatedData?: {
          produced?: number;
        };
        currentData?: Array<{
          channelTypeId: number;
          value: number;
        }>;
      };

      let acPowerKw = 0;
      let batterySoc: number | null = null;
      let gridPowerKw: number | null = null;

      if (flowData.currentData) {
        for (const ch of flowData.currentData) {
          if (ch.channelTypeId === 0) acPowerKw = ch.value / 1000;
          if (ch.channelTypeId === 4) batterySoc = ch.value;
          if (ch.channelTypeId === 1) gridPowerKw = ch.value / 1000;
        }
      }

      const dailyYieldKwh = (flowData.aggregatedData?.produced ?? 0) / 1000;

      metrics.push({
        sourceId: 0,
        sourceName: "",
        provider: "fronius",
        acPowerKw,
        dailyYieldKwh,
        batterySoc,
        gridPowerKw,
        timestamp: new Date().toISOString(),
      });
    }

    return metrics;
  },
};
