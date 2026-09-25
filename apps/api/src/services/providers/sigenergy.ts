import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter, ProviderAuth } from "./types";

export const sigenergyAdapter: ProviderAdapter = {
  providerId: "sigenergy",
  async poll(_auth: ProviderAuth): Promise<NormalizedMetric[]> {
    throw new Error("Sigenergy provider not implemented");
  },
};
