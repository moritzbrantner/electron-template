const counters = new Map<string, { count: number; resetAt: number }>();

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export async function checkRateLimit(
  key: string,
  { limit = 30, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): Promise<RateLimitDecision> {
  const now = Date.now();
  const current = counters.get(key);

  if (!current || current.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  const nextCount = current.count + 1;
  counters.set(key, { ...current, count: nextCount });

  return {
    allowed: nextCount <= limit,
    remaining: Math.max(limit - nextCount, 0),
    resetAt: current.resetAt,
  };
}
