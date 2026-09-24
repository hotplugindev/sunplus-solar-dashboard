import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter } from "./types";

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

  async poll(config: Record<string, string>): Promise<NormalizedMetric[]> {
    const username = config["username"];
    const password = config["password"];

    if (!username || !password) {
      throw new Error("Huawei requires username and password in config");
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
      throw new Error(`Huawei station list error: ${stationsRes.status}`);
    }

    const stationsData = await stationsRes.json() as {
      success?: boolean;
      data?: Array<{ code: string; name: string }>;
    };

    if (!stationsData.success || !stationsData.data) {
      throw new Error("Huawei returned no stations");
    }

    const stationCodes = stationsData.data.map((s) => s.code);
    if (stationCodes.length === 0) {
      return [];
    }

    const realtimeRes = await fetch(`${BASE_URL}/thirdData/getStationRealTimeData`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ stationCodes }),
    });

    if (!realtimeRes.ok) {
      throw new Error(`Huawei realtime data error: ${realtimeRes.status}`);
    }

    const realtimeData = await realtimeRes.json() as {
      success?: boolean;
      data?: Array<{
        stationCode: string;
        power?: number;
        dayEnergy?: number;
        collectTime?: string;
      }>;
    };

    if (!realtimeData.success || !realtimeData.data) {
      return [];
    }

    return realtimeData.data.map((station) => ({
      sourceId: 0,
      sourceName: "",
      provider: "huawei" as const,
      acPowerKw: (station.power ?? 0) / 1000,
      dailyYieldKwh: (station.dayEnergy ?? 0) / 1000,
      batterySoc: null,
      gridPowerKw: null,
      timestamp: station.collectTime ?? new Date().toISOString(),
    }));
  },
};
