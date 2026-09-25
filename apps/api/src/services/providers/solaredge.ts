import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter, ProviderAuth } from "./types";
import { solaredgeOverviewSchema, solaredgeFlowSchema } from "../validation";

const BASE_URL = "https://monitoringapi.solaredge.com";

export const solaredgeAdapter: ProviderAdapter = {
  providerId: "solaredge",

  async poll(auth: ProviderAuth): Promise<NormalizedMetric[]> {
    const apiKey = auth.api_key;
    const extra = JSON.parse(auth.extra_config || "{}") as Record<string, string>;
    const siteIds = (extra["siteIds"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    if (!apiKey || siteIds.length === 0) {
      throw new Error("SolarEdge requires api_key and siteIds in extra_config");
    }

    const metrics: NormalizedMetric[] = [];

    for (const siteId of siteIds) {
      const [overviewRes, currentRes] = await Promise.all([
        fetch(`${BASE_URL}/site/${siteId}/overview?api_key=${apiKey}`),
        fetch(`${BASE_URL}/site/${siteId}/currentPowerFlow?api_key=${apiKey}`),
      ]);

      if (!overviewRes.ok) {
        throw new Error(`SolarEdge overview error for site ${siteId}: ${overviewRes.status} ${overviewRes.statusText}`);
      }
      if (!currentRes.ok) {
        throw new Error(`SolarEdge flow error for site ${siteId}: ${currentRes.status} ${currentRes.statusText}`);
      }

      const overviewRaw = await overviewRes.json();
      const currentRaw = await currentRes.json();

      const overviewParsed = solaredgeOverviewSchema.safeParse(overviewRaw);
      const flowParsed = solaredgeFlowSchema.safeParse(currentRaw);

      if (!overviewParsed.success || !flowParsed.success) {
        throw new Error(`SolarEdge returned invalid data for site ${siteId}`);
      }

      const overview = overviewParsed.data.overview;
      const acPowerKw = (overview?.currentPower?.power ?? 0) / 1000;
      const dailyYieldKwh = (overview?.energyToday?.energy ?? 0) / 1000;
      const timestamp = new Date(overview?.lastUpdateTime ?? Date.now()).toISOString();

      let gridPowerKw: number | null = null;
      const connections = flowParsed.data.siteCurrentPowerFlow?.connections ?? [];
      for (const conn of connections) {
        if (conn.from === "LOAD" && conn.to === "GRID") {
          gridPowerKw = conn.value / 1000;
        }
        if (conn.from === "GRID" && conn.to === "LOAD") {
          gridPowerKw = -(conn.value / 1000);
        }
      }

      metrics.push({
        sourceId: 0,
        sourceName: "",
        provider: "solaredge",
        acPowerKw,
        dailyYieldKwh,
        batterySoc: null,
        gridPowerKw,
        timestamp,
      });
    }

    return metrics;
  },
};
