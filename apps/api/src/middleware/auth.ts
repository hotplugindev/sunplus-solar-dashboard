import { createMiddleware } from "hono/factory";
import { verifyPassword } from "../services/crypto";

type AuthRole = "dashboard" | "admin";

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { authRole: AuthRole };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  const adminRow = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'admin_password_hash'").first();
  const dashboardRow = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'dashboard_password_hash'").first();

  if (!adminRow || !dashboardRow) {
    return c.json({ error: "Not initialized" }, 401);
  }

  if (await verifyPassword(token, adminRow.value as string)) {
    c.set("authRole", "admin");
  } else if (await verifyPassword(token, dashboardRow.value as string)) {
    c.set("authRole", "dashboard");
  } else {
    return c.json({ error: "Invalid credentials" }, 403);
  }

  await next();
});

export const requireAdmin = createMiddleware<{
  Bindings: Env;
  Variables: { authRole: AuthRole };
}>(async (c, next) => {
  if (c.get("authRole") !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
});
