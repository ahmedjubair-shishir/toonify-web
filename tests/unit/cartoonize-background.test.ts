import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { bytesToBase64, cartoonize } from '@/background/cartoonize';
import { getInstallId } from '@/core/install-id';
import { setAiConsent, setAiTool, setSiteEnabled, setSiteTheme } from '@/core/settings';
import type { SiteKey } from '@/core/site';

const URL_ = 'https://toonify.example/api/cartoonize';
const message = {
  type: 'toonify/cartoonize' as const,
  imageUrl: 'https://cdn.example/cat.jpg',
  width: 800,
  height: 450,
};
const sender = { tab: { id: 1, url: 'https://www.wikipedia.org/wiki/Cat' } };
const site = 'wikipedia.org' as SiteKey;

const okFetch = () =>
  vi.fn(
    async () =>
      new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }),
  ) as unknown as typeof fetch & {
    mock: { calls: [string, RequestInit][] };
  };

beforeEach(async () => {
  fakeBrowser.reset();
});

describe('background cartoonize', () => {
  it('refuses when no server is configured, the site is off, or there is no consent', async () => {
    const fetchImpl = okFetch();
    expect(await cartoonize(message, sender, { fetchImpl, url: '' })).toMatchObject({
      ok: false,
      code: 'unavailable',
    });
    expect(await cartoonize(message, sender, { fetchImpl, url: URL_ })).toMatchObject({
      ok: false,
      code: 'site-off',
    });
    await setSiteEnabled(site, true);
    expect(await cartoonize(message, sender, { fetchImpl, url: URL_ })).toMatchObject({
      ok: false,
      code: 'tool',
    });
    await setAiTool('toonify');
    expect(await cartoonize(message, sender, { fetchImpl, url: URL_ })).toMatchObject({
      ok: false,
      code: 'consent',
    });
    expect(await cartoonize(message, {}, { fetchImpl, url: URL_ })).toMatchObject({
      ok: false,
      code: 'site-off',
    });
    expect(fetchImpl.mock.calls).toHaveLength(0);
  });

  it('refuses non-web image addresses', async () => {
    await setSiteEnabled(site, true);
    await setAiConsent(true);
    await setAiTool('toonify');
    const fetchImpl = okFetch();
    for (const imageUrl of [
      'data:image/png;base64,AAA',
      'blob:https://x/1',
      'javascript:alert(1)',
    ]) {
      expect(
        await cartoonize({ ...message, imageUrl }, sender, { fetchImpl, url: URL_ }),
      ).toMatchObject({ ok: false, code: 'image' });
    }
    expect(fetchImpl.mock.calls).toHaveLength(0);
  });

  it('sends the image address, site style, size and install id; returns the image', async () => {
    await setSiteEnabled(site, true);
    await setSiteTheme(site, 'storybook');
    await setAiConsent(true);
    await setAiTool('toonify');
    const fetchImpl = okFetch();
    const result = await cartoonize(message, sender, { fetchImpl, url: URL_ });
    expect(result).toEqual({ ok: true, mimeType: 'image/jpeg', base64: 'AQID' });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(URL_);
    expect((init?.headers as Record<string, string>)['x-toonify-install']).toBe(
      await getInstallId(),
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      imageUrl: 'https://cdn.example/cat.jpg',
      style: 'storybook',
      width: 800,
      height: 450,
    });
  });

  it('passes on the server’s safe error message and code', async () => {
    await setSiteEnabled(site, true);
    await setAiConsent(true);
    await setAiTool('toonify');
    const fetchImpl = (async () =>
      Response.json(
        { error: { code: 'user-limit', message: 'Try again in an hour.' } },
        { status: 429 },
      )) as typeof fetch;
    expect(await cartoonize(message, sender, { fetchImpl, url: URL_ })).toEqual({
      ok: false,
      code: 'user-limit',
      message: 'Try again in an hour.',
    });
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    expect(await cartoonize(message, sender, { fetchImpl: offline, url: URL_ })).toMatchObject({
      code: 'network',
    });
  });

  it('install id is random, stable, and not personal', async () => {
    const first = await getInstallId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(await getInstallId()).toBe(first);
  });

  it('base64-encodes large images without crashing', () => {
    const big = new Uint8Array(300_000).fill(65);
    expect(bytesToBase64(big).length).toBe(400_000);
  });
});
