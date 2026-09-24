import { Hono } from "hono";
import { telemetryIngestSchema } from "@sunplus/shared";
import { DeviceNotFoundError, ingestTelemetry } from "../services/ingestion";

export const telemetryRoutes = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

telemetryRoutes.post("/ingest", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = telemetryIngestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Validation failed", issues: parsed.error.issues },
      400
    );
  }

  try {
    const result = await ingestTelemetry(c.env, parsed.data);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof DeviceNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});
