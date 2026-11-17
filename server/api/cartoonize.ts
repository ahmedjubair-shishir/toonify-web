import { lookup as dnsLookup } from 'node:dns/promises';
import { DEFAULT_MODEL } from '../lib/gemini';
import { handleCartoonize, type HandlerConfig } from '../lib/handler';
import { noLimiter, upstashLimiter } from '../lib/rate-limit';

/**
 * Vercel Function: POST /api/cartoonize
 * Settings come from the project's environment variables (never from code):
 *   GEMINI_API_KEY            required
 *   GEMINI_IMAGE_MODEL        optional, default gemini-3.1-flash-lite-image
 *   ALLOWED_EXTENSION_IDS     comma list; set it before publishing
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   rate limits (required in production)
 *   LIMIT_PER_USER_PER_HOUR   default 20
 *   LIMIT_GLOBAL_PER_DAY      default 500
 */

function config(): HandlerConfig | null {
  const env = process.env;
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const redisUrl = env.UPSTASH_REDIS_REST_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
  const production = env.VERCEL_ENV === 'production';
  if (production && !(redisUrl && redisToken)) return null; // no unlimited spending in production
  return {
    apiKey,
    model: env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL,
    allowedExtensionIds: (env.ALLOWED_EXTENSION_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    limiter: redisUrl && redisToken ? upstashLimiter(redisUrl, redisToken) : noLimiter,
    perUserPerHour: Number(env.LIMIT_PER_USER_PER_HOUR) || 20,
    globalPerDay: Number(env.LIMIT_GLOBAL_PER_DAY) || 500,
    lookup: async (host) => (await dnsLookup(host, { all: true })).map((entry) => entry.address),
  };
}

async function handle(request: Request): Promise<Response> {
  const settings = config();
  if (settings === null) {
    return new Response(
      JSON.stringify({ error: { code: 'setup', message: 'Server is not configured' } }),
      {
        status: 503,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
  return handleCartoonize(request, settings);
}

export const POST = handle;
export const OPTIONS = handle;
