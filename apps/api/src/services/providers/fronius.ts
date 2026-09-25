import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter, ProviderAuth } from "./types";
import { froniusTokenSchema, froniusFlowSchema } from "../validation";

const BASE_URL = "https://api.solarweb.com";

export const froniusAdapter: ProviderAdapter = {
  providerId: "fronius",

  async poll(auth: ProviderAuth): Promise<NormalizedMetric[]> {
    const accessKeyId = auth.oauth_client_id;
    const accessKeyValue = auth.oauth_client_secret;
    const extra = JSON.parse(auth.extra_config || "{}") as Record<string, string>;
    const pvSystemIds = (extra["pvSystemIds"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    if (!accessKeyId || !accessKeyValue || pvSystemIds.length === 0) {
      throw new Error("Fronius requires oauth_client_id, oauth_client_secret, and pvSystemIds in extra_config");
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
      throw new Error(`Fronius auth failed: ${tokenRes.status} ${tokenRes.statusText}`);
    }

    const tokenRaw = await tokenRes.json();
    const tokenParsed = froniusTokenSchema.safeParse(tokenRaw);
    if (!tokenParsed.success) {
      throw new Error("Fronius returned invalid token response");
    }

    headers["Authorization"] = `${tokenParsed.data.accessTokenType} ${tokenParsed.data.accessToken}`;

    for (const pvSystemId of pvSystemIds) {
      const now = new Date().toISOString();
      const flowRes = await fetch(
        `${BASE_URL}/PvSystems/${pvSystemId}/FlowData?fromDateTime=${now}&toDateTime=${now}`,
        { headers }
      );

      if (!flowRes.ok) {
        throw new Error(`Fronius flow data error for ${pvSystemId}: ${flowRes.status} ${flowRes.statusText}`);
      }

      const flowRaw = await flowRes.json();
      const flowParsed = froniusFlowSchema.safeParse(flowRaw);
      if (!flowParsed.success) {
        throw new Error(`Fronius returned invalid flow data for ${pvSystemId}`);
      }

      const flowData = flowParsed.data;
      let acPowerKw = 0;
      let batterySoc: number | null = null;
      let gridPowerKw: number | null = null;

      for (const ch of flowData.currentData ?? []) {
        if (ch.channelTypeId === 0) acPowerKw = ch.value / 1000;
        if (ch.channelTypeId === 4) batterySoc = ch.value;
        if (ch.channelTypeId === 1) gridPowerKw = -ch.value / 1000;
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
