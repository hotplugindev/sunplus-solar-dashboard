import type { NormalizedMetric } from "@sunplus/shared";
import type { ProviderAdapter, ProviderAuth } from "./types";

async function ensureAccessToken(auth: ProviderAuth, db: D1Database): Promise<string> {
  const extra = JSON.parse(auth.extra_config || "{}") as Record<string, string>;
  const baseUrl = extra["baseUrl"] || "https://api.smaapis.de";
  const authUrl = extra["authUrl"] || "https://auth.smaapis.de";

  if (auth.oauth_access_token && auth.oauth_token_expiry) {
    const expiry = new Date(auth.oauth_token_expiry).getTime();
    if (expiry > Date.now() + 60000) {
      return auth.oauth_access_token;
    }
  }

  if (auth.oauth_refresh_token) {
    try {
      const refreshRes = await fetch(`${authUrl}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: auth.oauth_client_id || "",
          client_secret: auth.oauth_client_secret || "",
          refresh_token: auth.oauth_refresh_token,
        }).toString(),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json() as { access_token: string; refresh_token: string; expires_in: number };
        const expiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
        await db.prepare(
          "UPDATE provider_auth SET oauth_access_token = ?, oauth_refresh_token = ?, oauth_token_expiry = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(data.access_token, data.refresh_token, expiry, auth.id).run();
        return data.access_token;
      }
    } catch {}
  }

  const tokenRes = await fetch(`${authUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: auth.oauth_client_id || "",
      client_secret: auth.oauth_client_secret || "",
    }).toString(),
  });

  if (!tokenRes.ok) {
    throw new Error(`SMA token request failed: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number };
  const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await db.prepare(
    "UPDATE provider_auth SET oauth_access_token = ?, oauth_refresh_token = ?, oauth_token_expiry = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(tokenData.access_token, tokenData.refresh_token, expiry, auth.id).run();

  return tokenData.access_token;
}

export function createSmaAdapter(db: D1Database): ProviderAdapter {
  return {
    providerId: "sma",

    async poll(auth: ProviderAuth): Promise<NormalizedMetric[]> {
      const extra = JSON.parse(auth.extra_config || "{}") as Record<string, string>;
      const baseUrl = extra["baseUrl"] || "https://api.smaapis.de";
      const loginHint = extra["loginHint"] || "";

      const accessToken = await ensureAccessToken(auth, db);
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      if (loginHint) {
        const consentStatus = await checkConsent(baseUrl, loginHint, headers);
        if (consentStatus === "Pending") {
          await initiateConsent(baseUrl, loginHint, headers);
          throw new Error("SMA user consent pending. Please approve in SMA portal.");
        }
        if (consentStatus === "Denied") {
          throw new Error("SMA user consent denied.");
        }
      }

      const plantsRes = await fetch(`${baseUrl}/monitoring/v1/plants`, { headers });
      if (!plantsRes.ok) {
        throw new Error(`SMA plants list error: ${plantsRes.status}`);
      }

      const plantsData = await plantsRes.json() as { plants?: Array<{ plantId: string; name?: string }> };
      if (!plantsData.plants || plantsData.plants.length === 0) {
        return [];
      }

      const metrics: NormalizedMetric[] = [];

      for (const plant of plantsData.plants) {
        const devicesRes = await fetch(`${baseUrl}/monitoring/v1/plants/${plant.plantId}/devices`, { headers });
        if (!devicesRes.ok) continue;

        const devicesData = await devicesRes.json() as { devices?: Array<{ deviceId: string; type: string }> };
        if (!devicesData.devices) continue;

        const inverter = devicesData.devices.find((d) => d.type === "Solar Inverters");
        if (!inverter) continue;

        const yearMonth = new Date().toISOString().slice(0, 7);
        const energyRes = await fetch(
          `${baseUrl}/monitoring/v2/plants/${plant.plantId}/measurements/sets/EnergyBalance/Month?Date=${yearMonth}`,
          { headers }
        );

        let dailyYieldKwh = 0;
        if (energyRes.ok) {
          const energyData = await energyRes.json() as { measurements?: Array<{ value: number }> };
          if (energyData.measurements && energyData.measurements.length > 0) {
            dailyYieldKwh = energyData.measurements.reduce((sum, m) => sum + (m.value || 0), 0) / 1000;
          }
        }

        const powerRes = await fetch(
          `${baseUrl}/monitoring/v1/devices/${inverter.deviceId}/measurements/sets/EnergyAndPowerPv/Month?Date=${yearMonth}`,
          { headers }
        );

        let acPowerKw = 0;
        if (powerRes.ok) {
          const powerData = await powerRes.json() as { measurements?: Array<{ power?: number }> };
          if (powerData.measurements && powerData.measurements.length > 0) {
            const latest = powerData.measurements[powerData.measurements.length - 1];
            acPowerKw = (latest?.power || 0) / 1000;
          }
        }

        metrics.push({
          sourceId: 0,
          sourceName: plant.name || plant.plantId,
          provider: "sma",
          acPowerKw,
          dailyYieldKwh,
          batterySoc: null,
          gridPowerKw: null,
          timestamp: new Date().toISOString(),
        });
      }

      return metrics;
    },
  };
}

async function checkConsent(baseUrl: string, loginHint: string, headers: Record<string, string>): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/oauth2/v2/bc-authorize/${encodeURIComponent(loginHint)}`, {
      headers,
    });
    if (!res.ok) return "Unknown";
    const data = await res.json() as { status?: string };
    return data.status || "Unknown";
  } catch {
    return "Unknown";
  }
}

async function initiateConsent(baseUrl: string, loginHint: string, headers: Record<string, string>): Promise<void> {
  await fetch(`${baseUrl}/oauth2/v2/bc-authorize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ loginHint }),
  });
}
