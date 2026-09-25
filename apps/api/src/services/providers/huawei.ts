import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter, ProviderAuth } from "./types";
import { huaweiResponseSchema } from "../validation";

const BASE_URL = "https://eu5.fusionsolar.huawei.com";

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const huaweiAdapter: ProviderAdapter = {
  providerId: "huawei",

  async poll(auth: ProviderAuth): Promise<NormalizedMetric[]> {
    const username = auth.username;
    const password = auth.password_hash;

    if (!username || !password) {
      throw new Error("Huawei requires username and password_hash");
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const nonce = crypto.randomUUID().replace(/-/g, "");

    const canonicalRequest = `POST\n/thirdData/getStationList\n\nhost:eu5.fusionsolar.huawei.com\nx-dt-ak:${username}\nx-dt-timestamp:${timestamp}\n\nhost;x-dt-ak;x-dt-timestamp\n`;
    const hashedPayload = bytesToHex(await sha256(new TextEncoder().encode("")));
    const stringToSign = `DTL-HMAC-SHA256\n${timestamp}\n${nonce}\n${hashedPayload}`;
    const signature = bytesToHex(
      await hmacSha256(new TextEncoder().encode(password), new TextEncoder().encode(stringToSign))
    );

    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-dt-ak": username,
      "x-dt-timestamp": timestamp,
      "x-dt-nonce": nonce,
      "x-dt-signature": signature,
    };

    const stationsRes = await fetch(`${BASE_URL}/thirdData/getStationList`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });

    if (!stationsRes.ok) {
      throw new Error(`Huawei station list error: ${stationsRes.status} ${stationsRes.statusText}`);
    }

    const stationsRaw = await stationsRes.json();
    const stationsParsed = huaweiResponseSchema.safeParse(stationsRaw);
    if (!stationsParsed.success || !stationsParsed.data.success || !stationsParsed.data.data) {
      throw new Error("Huawei returned invalid station data");
    }

    const stationCodes = stationsParsed.data.data.map((s: { code?: string; stationCode?: string }) => s.code ?? s.stationCode ?? "").filter(Boolean);
    if (stationCodes.length === 0) {
      return [];
    }

    const realtimeRes = await fetch(`${BASE_URL}/thirdData/getStationRealTimeData`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ stationCodes }),
    });

    if (!realtimeRes.ok) {
      throw new Error(`Huawei realtime data error: ${realtimeRes.status} ${realtimeRes.statusText}`);
    }

    const realtimeRaw = await realtimeRes.json();
    const realtimeParsed = huaweiResponseSchema.safeParse(realtimeRaw);
    if (!realtimeParsed.success || !realtimeParsed.data.success || !realtimeParsed.data.data) {
      return [];
    }

    return realtimeParsed.data.data.map((station: { power?: number; dayEnergy?: number; collectTime?: string }) => {
      const rawTs = station.collectTime;
      const ts = rawTs && !rawTs.includes("T") ? new Date(Number(rawTs)).toISOString() : new Date(rawTs ?? Date.now()).toISOString();
      return {
        sourceId: 0,
        sourceName: "",
        provider: "huawei" as const,
        acPowerKw: (station.power ?? 0) / 1000,
        dailyYieldKwh: (station.dayEnergy ?? 0) / 1000,
        batterySoc: null,
        gridPowerKw: null,
        timestamp: ts,
      };
    });
  },
};
