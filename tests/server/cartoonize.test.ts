// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { GEMINI_ENDPOINT, ProviderError, extractImage, redrawImage } from '../../server/lib/gemini';
import { allowedOrigin, handleCartoonize, type HandlerConfig } from '../../server/lib/handler';
import type { RateLimiter } from '../../server/lib/rate-limit';
import { upstashLimiter } from '../../server/lib/rate-limit';

const EXT = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';
const CARTOON = Buffer.from('cartoon-jpeg-bytes').toString('base64');

/** Stand-in for the internet: the source image and Gemini. */
function fakeNetwork(
  gemini: () => Response = () =>
    Response.json({
      steps: [
        {
          type: 'model_output',
          content: [{ type: 'image', data: CARTOON, mime_type: 'image/jpeg' }],
        },
      ],
    }),
) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, ...(init ? { init } : {}) });
    if (url === GEMINI_ENDPOINT) return gemini();
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const allowAll: RateLimiter = { take: async () => true };

function config(overrides: Partial<HandlerConfig> = {}): HandlerConfig {
  return {
    apiKey: 'test-key',
    model: 'gemini-3.1-flash-lite-image',
    allowedExtensionIds: [],
    limiter: allowAll,
    perUserPerHour: 20,
    globalPerDay: 500,
    lookup: async () => ['93.184.216.34'],
    ...fakeNetwork(),
    ...overrides,
  };
}

const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://toonify.example/api/cartoonize', {
    method: 'POST',
    headers: {
      origin: EXT,
      'content-type': 'application/json',
      'x-toonify-install': 'install-1234',
      ...headers,
    },
    body: JSON.stringify(body),
  });

const valid = {
  imageUrl: 'https://cdn.example/cat.png',
  style: 'comic-book',
  width: 1600,
  height: 900,
};

describe('who may call', () => {
  it('accepts extension origins only, optionally a fixed list', () => {
    expect(allowedOrigin(EXT, [])).toBe(EXT);
    expect(allowedOrigin('https://evil.example', [])).toBeNull();
    expect(allowedOrigin(null, [])).toBeNull();
    expect(allowedOrigin(EXT, ['someotherid'])).toBeNull();
    expect(allowedOrigin(EXT, ['abcdefghijklmnopabcdefghijklmnop'])).toBe(EXT);
  });

  it('answers preflight for extensions and refuses websites', async () => {
    const ok = await handleCartoonize(
      new Request('https://x/api', { method: 'OPTIONS', headers: { origin: EXT } }),
      config(),
    );
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe(EXT);
    const no = await handleCartoonize(
      new Request('https://x/api', {
        method: 'OPTIONS',
        headers: { origin: 'https://evil.example' },
      }),
      config(),
    );
    expect(no.status).toBe(403);
    const site = await handleCartoonize(
      request(valid, { origin: 'https://evil.example' }),
      config(),
    );
    expect(site.status).toBe(403);
  });
});

describe('cartoonize', () => {
  it('fetches the image, asks Gemini with the style prompt, and returns the cartoon', async () => {
    const network = fakeNetwork();
    const response = await handleCartoonize(request(valid), config(network));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('cartoon-jpeg-bytes');

    const gemini = network.calls.find((call) => call.url === GEMINI_ENDPOINT);
    const sent = JSON.parse(String(gemini?.init?.body));
    expect((gemini?.init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    expect(sent.model).toBe('gemini-3.1-flash-lite-image');
    expect(sent.input[0].text).toContain('comic book');
    expect(sent.input[1]).toEqual({
      type: 'image',
      mime_type: 'image/png',
      data: Buffer.from([1, 2, 3]).toString('base64'),
    });
    expect(sent.response_format).toEqual({
      type: 'image',
      mime_type: 'image/jpeg',
      aspect_ratio: '16:9',
      image_size: '1K',
    });
  });

  it('validates input before spending anything', async () => {
    const network = fakeNetwork();
    const cfg = config(network);
    expect((await handleCartoonize(request({ ...valid, style: 'nope' }), cfg)).status).toBe(400);
    expect((await handleCartoonize(request({ ...valid, imageUrl: 42 }), cfg)).status).toBe(400);
    expect((await handleCartoonize(request(valid, { 'x-toonify-install': '' }), cfg)).status).toBe(
      400,
    );
    expect(network.calls).toHaveLength(0);
  });

  it('enforces per-user and daily limits', async () => {
    const network = fakeNetwork();
    const limiter: RateLimiter = { take: async (key) => !key.startsWith('u:') };
    const user = await handleCartoonize(request(valid), config({ ...network, limiter }));
    expect(user.status).toBe(429);
    expect(((await user.json()) as { error: { code: string } }).error.code).toBe('user-limit');
    const daily = await handleCartoonize(
      request(valid),
      config({ ...network, limiter: { take: async (key) => !key.startsWith('g:') } }),
    );
    expect(((await daily.json()) as { error: { code: string } }).error.code).toBe('daily-limit');
    expect(network.calls).toHaveLength(0);
  });

  it('maps failures to short, safe messages (no Google details leak)', async () => {
    const blocked = await handleCartoonize(
      request(valid),
      config(fakeNetwork(() => Response.json({ steps: [] }))),
    );
    expect(blocked.status).toBe(422);
    const down = await handleCartoonize(
      request(valid),
      config(fakeNetwork(() => new Response('secret details', { status: 500 }))),
    );
    expect(down.status).toBe(502);
    expect(await down.text()).not.toContain('secret');
    const privateImage = await handleCartoonize(
      request(valid),
      config({ lookup: async () => ['10.0.0.1'] }),
    );
    expect(privateImage.status).toBe(422);
  });
});

describe('Gemini response parsing', () => {
  it('reads output_image or the last image in model_output steps', () => {
    expect(extractImage({ output_image: { data: 'AAA', mime_type: 'image/png' } })).toEqual({
      data: 'AAA',
      mimeType: 'image/png',
    });
    expect(
      extractImage({
        steps: [
          { type: 'thought', content: [{ type: 'image', data: 'draft' }] },
          { type: 'model_output', content: [{ type: 'text' }, { type: 'image', data: 'final' }] },
        ],
      }),
    ).toEqual({ data: 'final', mimeType: 'image/jpeg' });
    expect(
      extractImage({ steps: [{ type: 'model_output', content: [{ type: 'text' }] }] }),
    ).toBeNull();
    expect(extractImage(null)).toBeNull();
  });

  it('throws ProviderError on HTTP errors', async () => {
    await expect(
      redrawImage({
        apiKey: 'k',
        model: 'm',
        prompt: 'p',
        image: new Uint8Array([1]),
        mimeType: 'image/png',
        aspectRatio: '1:1',
        fetchImpl: (async () => new Response('', { status: 403 })) as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(ProviderError);
  });
});

describe('upstash limiter', () => {
  it('counts with INCR + EXPIRE and compares with the limit', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json([{ result: 21 }, { result: 1 }]),
    ) as unknown as typeof fetch;
    const limiter = upstashLimiter('https://redis.example/', 'token', fetchImpl);
    expect(await limiter.take('u:x', 20, 3600)).toBe(false);
    const [url, init] =
      (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0] ?? [];
    expect(url).toBe('https://redis.example/pipeline');
    expect(JSON.parse(String(init?.body))).toEqual([
      ['INCR', 'u:x'],
      ['EXPIRE', 'u:x', '3600', 'NX'],
    ]);
  });
});
