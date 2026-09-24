import type { ProviderAdapter } from "./types";
import type { ProviderId } from "@sunplus/shared";
import { solaredgeAdapter } from "./solaredge";
import { froniusAdapter } from "./fronius";
import { huaweiAdapter } from "./huawei";
import { sungrowAdapter } from "./sungrow";

const adapters: Partial<Record<ProviderId, ProviderAdapter>> = {
  solaredge: solaredgeAdapter,
  fronius: froniusAdapter,
  huawei: huaweiAdapter,
  sungrow: sungrowAdapter,
};

export function getAdapter(providerId: ProviderId): ProviderAdapter | undefined {
  return adapters[providerId];
}
