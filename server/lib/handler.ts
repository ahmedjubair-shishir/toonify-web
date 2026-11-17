import { nearestAspectRatio } from './aspect';
import { fetchPublicImage, ImageFetchError } from './fetch-image';
import { ProviderError, redrawImage } from './gemini';
import type { RateLimiter } from './rate-limit';
import { UnsafeUrlError, type Lookup } from './safe-url';
import { STYLE_PROMPTS, isStyleId } from './styles';

export interface HandlerConfig {
  apiKey: string;
  model: string;
  /** Extension ids allowed to call (empty = any Chrome/Firefox extension, for development). */
  allowedExtensionIds: string[];
  limiter: RateLimiter;
  perUserPerHour: number;
  globalPerDay: number;
  lookup: Lookup;
  fetchImpl?: typeof fetch;
}

/** Only browser-extension pages may call this endpoint (not websites). */
export function allowedOrigin(origin: string | null, allowedIds: string[]): string | null {
  if (!origin) return null;
  const match = /^(chrome|moz)-extension:\/\/([a-z0-9-]+)$/.exec(origin);
  if (!match?.[2]) return null;
  return allowedIds.length === 0 || allowedIds.includes(match[2]) ? origin : null;
}

const corsHeaders = (origin: string): Record<string, string> => ({
  'access-control-allow-origin': origin,
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-toonify-install',
  'access-control-max-age': '600',
  vary: 'origin',
});

/** Errors are short, user-safe sentences with a stable code for the extension. */
function error(origin: string | null, status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json', ...(origin ? corsHeaders(origin) : {}) },
  });
}

const INSTALL_ID = /^[a-z0-9-]{8,64}$/i;

export async function handleCartoonize(request: Request, config: HandlerConfig): Promise<Response> {
  const origin = allowedOrigin(request.headers.get('origin'), config.allowedExtensionIds);
  if (request.method === 'OPTIONS') {
    return origin
      ? new Response(null, { status: 204, headers: corsHeaders(origin) })
      : new Response(null, { status: 403 });
  }
  if (request.method !== 'POST') return error(origin, 405, 'method', 'Use POST');
  if (!origin) return error(null, 403, 'origin', 'Not allowed');

  // An anonymous random id created by the extension at install; no personal data.
  const install = request.headers.get('x-toonify-install') ?? '';
  if (!INSTALL_ID.test(install)) return error(origin, 400, 'install', 'Missing install id');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(origin, 400, 'body', 'Invalid request');
  }
  const { imageUrl, style, width, height } = (body ?? {}) as Record<string, unknown>;
  if (typeof imageUrl !== 'string' || imageUrl.length > 4096)
    return error(origin, 400, 'image', 'Invalid image address');
  if (!isStyleId(style)) return error(origin, 400, 'style', 'Unknown style');

  try {
    if (!(await config.limiter.take(`u:${install}`, config.perUserPerHour, 3600))) {
      return error(
        origin,
        429,
        'user-limit',
        'You have cartoonized a lot of images. Please try again in an hour.',
      );
    }
    const day = new Date().toISOString().slice(0, 10);
    if (!(await config.limiter.take(`g:${day}`, config.globalPerDay, 86_400))) {
      return error(
        origin,
        429,
        'daily-limit',
        'Toonify has reached today’s limit. Please try again tomorrow.',
      );
    }
  } catch {
    return error(origin, 503, 'busy', 'Toonify is busy. Please try again shortly.');
  }

  try {
    const image = await fetchPublicImage(imageUrl, {
      lookup: config.lookup,
      ...(config.fetchImpl ? { fetchImpl: config.fetchImpl } : {}),
    });
    const result = await redrawImage({
      apiKey: config.apiKey,
      model: config.model,
      prompt: STYLE_PROMPTS[style] ?? '',
      image: image.bytes,
      mimeType: image.mimeType,
      aspectRatio: nearestAspectRatio(Number(width), Number(height)),
      ...(config.fetchImpl ? { fetchImpl: config.fetchImpl } : {}),
    });
    return new Response(new Blob([result.bytes as Uint8Array<ArrayBuffer>]), {
      status: 200,
      headers: {
        'content-type': result.mimeType,
        // The result is for this user only; never cached by shared caches.
        'cache-control': 'private, max-age=86400',
        ...corsHeaders(origin),
      },
    });
  } catch (cause) {
    if (cause instanceof UnsafeUrlError || cause instanceof ImageFetchError) {
      return error(
        origin,
        422,
        'image',
        'This image can’t be cartoonized (it may be private or an unsupported type).',
      );
    }
    if (cause instanceof ProviderError && cause.status === 422) {
      return error(origin, 422, 'declined', 'The AI couldn’t redraw this image. Try another one.');
    }
    return error(origin, 502, 'provider', 'The AI service didn’t respond. Please try again.');
  }
}
