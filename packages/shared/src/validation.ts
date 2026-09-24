import { z } from "zod";

export const telemetryRangeSchema = z.enum(["1h", "6h", "24h", "7d", "30d"]);

export const sourceCreateSchema = z.object({
  name: z.string().min(1).max(256),
  provider: z.enum(["huawei", "sungrow", "solaredge", "sma", "fronius", "sigenergy"]),
  config: z.record(z.string()),
  pollIntervalMinutes: z.number().int().min(5).max(1440).default(15),
});

export const sourceUpdateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  config: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
  pollIntervalMinutes: z.number().int().min(5).max(1440).optional(),
});

export type TelemetryRangeInput = z.infer<typeof telemetryRangeSchema>;
export type SourceCreateInput = z.infer<typeof sourceCreateSchema>;
export type SourceUpdateInput = z.infer<typeof sourceUpdateSchema>;
