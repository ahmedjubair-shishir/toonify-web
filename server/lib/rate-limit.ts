/**
 * Fixed-window rate limit stored in Upstash Redis (REST API), so every
 * serverless instance shares the same counts. Two limits: per caller per
 * hour, and a global daily cap that protects the owner's Gemini bill.
 */

export interface RateLimiter {
  /** Counts one request; false means "over the limit". */
  take(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

export function upstashLimiter(
  url: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): RateLimiter {
  return {
    async take(key, limit, windowSeconds) {
      const response = await fetchImpl(`${url.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, String(windowSeconds), 'NX'],
        ]),
      });
      if (!response.ok) throw new Error(`Rate limit store failed (${response.status})`);
      const [incr] = (await response.json()) as [{ result?: number }];
      return (incr?.result ?? Infinity) <= limit;
    },
  };
}

/** For local development only: allows everything. */
export const noLimiter: RateLimiter = { take: async () => true };
