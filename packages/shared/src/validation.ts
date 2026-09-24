import { z } from "zod";

export const telemetryIngestSchema = z.object({
  deviceId: z.string().min(1).max(128),
  voltage: z.number().positive().max(2000),
  current: z.number().positive().max(5000),
  temperatureC: z.number().min(-60).max(150),
  efficiencyPct: z.number().min(0).max(100),
});

export const telemetryRangeSchema = z.enum(["1h", "6h", "24h", "7d", "30d"]);

export const deviceCreateSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(256),
  siteLocation: z.string().min(1).max(256),
  capacityKw: z.number().positive(),
});

export const alertResolveSchema = z.object({
  alertId: z.number().int().positive(),
});

export type TelemetryIngestInput = z.infer<typeof telemetryIngestSchema>;
export type DeviceCreateInput = z.infer<typeof deviceCreateSchema>;
export type TelemetryRangeInput = z.infer<typeof telemetryRangeSchema>;
