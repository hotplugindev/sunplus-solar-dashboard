import { Hono } from "hono";
import { sourceCreateSchema, sourceUpdateSchema } from "@sunplus/shared";
import {
  createSource,
  deleteSource,
  getSource,
  listSources,
  updateSource,
  upsertProviderAuth,
  getProviderAuth,
  deleteProviderAuth,
} from "../services/sources";

export const sourceRoutes = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

sourceRoutes.get("/", async (c) => {
  const sources = await listSources(c.env.DB);
  return c.json({ sources });
});

sourceRoutes.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = sourceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", issues: parsed.error.issues }, 400);
  }

  const { auth, ...sourceInput } = parsed.data as any;
  const source = await createSource(c.env.DB, sourceInput);

  if (auth) {
    await upsertProviderAuth(c.env.DB, source.id, auth);
  }

  return c.json({ source }, 201);
});

sourceRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid source ID" }, 400);

  const source = await getSource(c.env.DB, id);
  if (!source) return c.json({ error: "Source not found" }, 404);

  const auth = await getProviderAuth(c.env.DB, id);

  return c.json({ source, auth });
});

sourceRoutes.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid source ID" }, 400);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = sourceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", issues: parsed.error.issues }, 400);
  }

  const { auth, ...sourceInput } = parsed.data as any;
  const source = await updateSource(c.env.DB, id, sourceInput);
  if (!source) return c.json({ error: "Source not found" }, 404);

  if (auth) {
    await upsertProviderAuth(c.env.DB, id, auth);
  }

  return c.json({ source });
});

sourceRoutes.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid source ID" }, 400);

  await deleteProviderAuth(c.env.DB, id);
  const deleted = await deleteSource(c.env.DB, id);
  if (!deleted) return c.json({ error: "Source not found" }, 404);

  return c.json({ success: true });
});

sourceRoutes.put("/:id/auth", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid source ID" }, 400);

  const body = await c.req.json();
  await upsertProviderAuth(c.env.DB, id, body);
  return c.json({ success: true });
});
