import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter } from "./types";

const BASE_URL = "https://monitoringapi.solaredge.com";

export const solaredgeAdapter: ProviderAdapter = {
  providerId: "solaredge",

  async poll(config: Record<string, string>): Promise<NormalizedMetric[]> {
    const apiKey = config["apiKey"];
    const siteIds = (config["siteIds"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    if (!apiKey || siteIds.length === 0) {
      throw new Error("SolarEdge requires apiKey and siteIds in config");
    }

    const metrics: NormalizedMetric[] = [];

    for (const siteId of siteIds) {
      const [overviewRes, currentRes] = await Promise.all([
        fetch(`${BASE_URL}/site/${siteId}/overview?api_key=${apiKey}`),
        fetch(`${BASE_URL}/site/${siteId}/currentPowerFlow?api_key=${apiKey}`),
      ]);

      if (!overviewRes.ok || !currentRes.ok) {
        throw new Error(`SolarEdge API error for site ${siteId}: ${overviewRes.status}`);
      }

      const overview = await overviewRes.json() as {
        overview?: {
          currentPower?: { power: number };
          energyToday?: { energy: number };
          lastUpdateTime?: string;
        };
      };

      const current = await currentRes.json() as {
        siteCurrentPowerFlow?: {
          unit?: string;
          connections?: Array<{ from: string; to: string; value: number }>;
        };
      };

      const acPowerKw = (overview.overview?.currentPower?.power ?? 0) / 1000;
      const dailyYieldKwh = (overview.overview?.energyToday?.energy ?? 0) / 1000;
      const timestamp = overview.overview?.lastUpdateTime ?? new Date().toISOString();

      let gridPowerKw: number | null = null;
      if (current.siteCurrentPowerFlow?.connections) {
        for (const conn of current.siteCurrentPowerFlow.connections) {
          if (conn.from === "LOAD" && conn.to === "GRID") {
            gridPowerKw = conn.value / 1000;
          }
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
