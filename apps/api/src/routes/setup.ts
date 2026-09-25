import { Hono } from "hono";
import { hashPassword, verifyPassword } from "../services/crypto";

export const setupRoutes = new Hono<{ Bindings: Env }>();

setupRoutes.get("/status", async (c) => {
  const row = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'setup_complete'").first();
  return c.json({ setupComplete: !!row });
});

setupRoutes.post("/initialize", async (c) => {
  const existing = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'setup_complete'").first();
  if (existing) {
    return c.json({ error: "Already initialized" }, 409);
  }

  const body = await c.req.json();
  const { admin_password, dashboard_password } = body;

  if (!admin_password || !dashboard_password) {
    return c.json({ error: "Both passwords required" }, 400);
  }

  const adminHash = await hashPassword(admin_password);
  const dashboardHash = await hashPassword(dashboard_password);

  const batch = [
    c.env.DB.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").bind("admin_password_hash", adminHash),
    c.env.DB.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").bind("dashboard_password_hash", dashboardHash),
    c.env.DB.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").bind("setup_complete", "true"),
  ];

  await c.env.DB.batch(batch);

  return c.json({ status: "initialized" });
});

setupRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const { password, role } = body;

  if (!password || !role) {
    return c.json({ error: "Password and role required" }, 400);
  }

  const key = role === "admin" ? "admin_password_hash" : "dashboard_password_hash";
  const row = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = ?").bind(key).first();

  if (!row) {
    return c.json({ error: "Not initialized" }, 401);
  }

  const valid = await verifyPassword(password, row.value as string);
  if (!valid) {
    return c.json({ error: "Invalid password" }, 401);
  }

  return c.json({ token: password, role });
});
