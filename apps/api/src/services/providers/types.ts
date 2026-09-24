import type { NormalizedMetric, ProviderId } from "@sunplus/shared";

export interface ProviderAdapter {
  providerId: ProviderId;
  poll(config: Record<string, string>): Promise<NormalizedMetric[]>;
}
