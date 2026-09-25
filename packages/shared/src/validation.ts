import { z } from "zod";

export const telemetryRangeSchema = z.enum(["1h", "6h", "24h", "7d", "30d"]);

export const providerAuthSchema = z.object({
  username: z.string().optional(),
  password_hash: z.string().optional(),
  api_key: z.string().optional(),
  oauth_client_id: z.string().optional(),
  oauth_client_secret: z.string().optional(),
  extra_config: z.record(z.string()).optional(),
});

export const sourceCreateSchema = z.object({
  name: z.string().min(1).max(256),
  provider: z.enum(["huawei", "sungrow", "solaredge", "sma", "fronius", "sigenergy"]),
  config: z.record(z.string()).default({}),
  pollIntervalMinutes: z.number().int().min(5).max(1440).default(15),
  auth: providerAuthSchema.optional(),
});

export const sourceUpdateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  config: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
  pollIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  auth: providerAuthSchema.optional(),
});

export type TelemetryRangeInput = z.infer<typeof telemetryRangeSchema>;
export type SourceCreateInput = z.infer<typeof sourceCreateSchema>;
export type SourceUpdateInput = z.infer<typeof sourceUpdateSchema>;
export type ProviderAuthInput = z.infer<typeof providerAuthSchema>;
