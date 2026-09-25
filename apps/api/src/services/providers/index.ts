import type { ProviderAdapter } from "./types";
import type { ProviderId } from "@sunplus/shared";
import { solaredgeAdapter } from "./solaredge";
import { froniusAdapter } from "./fronius";
import { huaweiAdapter } from "./huawei";
import { sungrowAdapter } from "./sungrow";
import { createSmaAdapter } from "./sma";
import { sigenergyAdapter } from "./sigenergy";

const adapters: Partial<Record<ProviderId, ProviderAdapter | ((db: D1Database) => ProviderAdapter)>> = {
  solaredge: solaredgeAdapter,
  fronius: froniusAdapter,
  huawei: huaweiAdapter,
  sungrow: sungrowAdapter,
  sma: createSmaAdapter,
  sigenergy: sigenergyAdapter,
};

export function getAdapter(providerId: ProviderId, db: D1Database): ProviderAdapter | undefined {
  const entry = adapters[providerId];
  if (!entry) return undefined;
  if (typeof entry === "function") return entry(db);
  return entry;
}
