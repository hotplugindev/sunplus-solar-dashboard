import { createMiddleware } from "hono/factory";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

const MAX_TOKENS = 60;
const REFILL_PER_SEC = 10;
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const now = Date.now();
  const key =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for") ??
    "unknown";

  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    buckets.clear();
    lastSweep = now;
  }

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(key, bucket);
  }

  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsedSec * REFILL_PER_SEC);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  bucket.tokens -= 1;
  await next();
});
