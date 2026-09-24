import { createMiddleware } from "hono/factory";

type AuthRole = "device" | "admin";

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { authRole: AuthRole };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  if (token === c.env.DEVICE_API_KEY) {
    c.set("authRole", "device");
  } else if (token === c.env.ADMIN_API_KEY) {
    c.set("authRole", "admin");
  } else {
    return c.json({ error: "Invalid API key" }, 403);
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
