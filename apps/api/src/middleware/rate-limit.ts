import { createMiddleware } from "hono/factory";

const MAX_TOKENS = 60;
const REFILL_PER_SEC = 10;
const KV_PREFIX = "rl:";
const KV_TTL = 120;

export const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const key = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
  const kvKey = `${KV_PREFIX}${key}`;
  const now = Date.now();

  let tokens = MAX_TOKENS;
  let lastRefill = now;

  try {
    const stored = await c.env.TELEMETRY_KV.get(kvKey);
    if (stored) {
      const parsed = JSON.parse(stored) as { tokens: number; lastRefill: number };
      tokens = parsed.tokens;
      lastRefill = parsed.lastRefill;
    }
  } catch {}

  const elapsedSec = (now - lastRefill) / 1000;
  tokens = Math.min(MAX_TOKENS, tokens + elapsedSec * REFILL_PER_SEC);
  lastRefill = now;

  if (tokens < 1) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  tokens -= 1;

  c.executionCtx.waitUntil(
    c.env.TELEMETRY_KV.put(kvKey, JSON.stringify({ tokens, lastRefill }), { expirationTtl: KV_TTL })
  );

  await next();
});
