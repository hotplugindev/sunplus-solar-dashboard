import { Hono } from "hono";
import { deviceCreateSchema, telemetryRangeSchema } from "@sunplus/shared";
import {
  getDevice,
  getLatestTelemetry,
  getTelemetryHistory,
  listDevices,
  registerDevice,
} from "../services/devices";

const CDN_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

export const deviceRoutes = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

deviceRoutes.get("/", async (c) => {
  const devices = await listDevices(c.env.DB);
  return c.json({ devices });
});

deviceRoutes.get("/latest", async (c) => {
  const devices = await listDevices(c.env.DB);

  const telemetryPromises = devices.map(async (device) => {
    const telemetry = await getLatestTelemetry(c.env.TELEMETRY_KV, device.id);
    return { device, telemetry };
  });

  const results = await Promise.all(telemetryPromises);
  return c.json({ devices: results }, 200, CDN_CACHE_HEADERS);
});

deviceRoutes.post("/register", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = deviceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", issues: parsed.error.issues }, 400);
  }

  const existing = await getDevice(c.env.DB, parsed.data.id);
  if (existing) {
    return c.json({ error: `Device already exists: ${parsed.data.id}` }, 409);
  }

  const device = await registerDevice(c.env.DB, parsed.data);
  return c.json({ device }, 201);
});

deviceRoutes.get("/:id", async (c) => {
  const device = await getDevice(c.env.DB, c.req.param("id"));
  if (!device) {
    return c.json({ error: "Device not found" }, 404);
  }
  return c.json({ device });
});

deviceRoutes.get("/:id/telemetry/latest", async (c) => {
  const deviceId = c.req.param("id");
  const device = await getDevice(c.env.DB, deviceId);
  if (!device) {
    return c.json({ error: "Device not found" }, 404);
  }

  const telemetry = await getLatestTelemetry(c.env.TELEMETRY_KV, deviceId);
  if (!telemetry) {
    return c.json({ error: "No telemetry received yet for this device" }, 404);
  }

  return c.json({ telemetry }, 200, CDN_CACHE_HEADERS);
});

deviceRoutes.get("/:id/telemetry/history", async (c) => {
  const deviceId = c.req.param("id");
  const device = await getDevice(c.env.DB, deviceId);
  if (!device) {
    return c.json({ error: "Device not found" }, 404);
  }

  const rangeParam = c.req.query("range") ?? "24h";
  const rangeParsed = telemetryRangeSchema.safeParse(rangeParam);
  if (!rangeParsed.success) {
    return c.json({ error: `Invalid range. Use one of: 1h, 6h, 24h, 7d, 30d` }, 400);
  }

  if (rangeParsed.data === "30d") {
    const chartData = await c.env.TELEMETRY_KV.get(`chart:${deviceId}:90d`);
    if (chartData) {
      return c.json(
        { deviceId, range: rangeParsed.data, telemetry: JSON.parse(chartData) },
        200,
        CDN_CACHE_HEADERS
      );
    }
  }

  const telemetry = await getTelemetryHistory(c.env.DB, deviceId, rangeParsed.data);
  return c.json({ deviceId, range: rangeParsed.data, telemetry }, 200, CDN_CACHE_HEADERS);
});

deviceRoutes.get("/:id/chart/90d", async (c) => {
  const deviceId = c.req.param("id");

  const chartData = await c.env.TELEMETRY_KV.get(`chart:${deviceId}:90d`);
  if (chartData) {
    return c.json(
      { deviceId, data: JSON.parse(chartData) },
      200,
      CDN_CACHE_HEADERS
    );
  }

  return c.json({ deviceId, data: [] }, 200, CDN_CACHE_HEADERS);
});
