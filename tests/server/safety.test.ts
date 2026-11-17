// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nearestAspectRatio } from '../../server/lib/aspect';
import { fetchPublicImage, MAX_IMAGE_BYTES } from '../../server/lib/fetch-image';
import { assertPublicUrl, isPrivateAddress, type Lookup } from '../../server/lib/safe-url';
import { STYLE_PROMPTS, isStyleId } from '../../server/lib/styles';
import { THEMES } from '../../src/core/themes';

const publicDns: Lookup = async () => ['93.184.216.34'];

describe('nearestAspectRatio', () => {
  it.each([
    [1600, 900, '16:9'],
    [400, 300, '4:3'],
    [300, 400, '3:4'],
    [500, 500, '1:1'],
    [2100, 900, '21:9'],
    [0, 0, '1:1'],
  ])('%i x %i -> %s', (w, h, ratio) => {
    expect(nearestAspectRatio(w, h)).toBe(ratio);
  });
});

describe('styles', () => {
  it('has a prompt for every extension style and nothing unknown', () => {
    for (const theme of THEMES) expect(isStyleId(theme.id)).toBe(true);
    expect(isStyleId('__proto__')).toBe(false);
    expect(isStyleId('toString')).toBe(false);
    for (const prompt of Object.values(STYLE_PROMPTS))
      expect(prompt).toContain('Do not add any text');
  });
});

describe('SSRF protection', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.20.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('treats %s as private', (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(['93.184.216.34', '8.8.8.8', '2606:4700::6810:85e5'])('treats %s as public', (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );

  it('rejects private hosts, odd schemes, passwords and ports', async () => {
    const privateDns: Lookup = async () => ['10.0.0.5'];
    await expect(assertPublicUrl('https://internal.example/a.jpg', privateDns)).rejects.toThrow(
      'Private',
    );
    await expect(assertPublicUrl('http://127.0.0.1/a.jpg', publicDns)).rejects.toThrow('Private');
    await expect(assertPublicUrl('http://[::1]/a.jpg', publicDns)).rejects.toThrow('Private');
    await expect(assertPublicUrl('file:///etc/passwd', publicDns)).rejects.toThrow('http');
    await expect(assertPublicUrl('https://u:p@cdn.example/a.jpg', publicDns)).rejects.toThrow(
      'password',
    );
    await expect(assertPublicUrl('https://cdn.example:6379/a.jpg', publicDns)).rejects.toThrow(
      'port',
    );
    await expect(assertPublicUrl('https://cdn.example/a.jpg', publicDns)).resolves.toBeInstanceOf(
      URL,
    );
  });

  it('rejects a host if ANY of its addresses is private (DNS tricks)', async () => {
    const mixed: Lookup = async () => ['93.184.216.34', '127.0.0.1'];
    await expect(assertPublicUrl('https://tricky.example/a.jpg', mixed)).rejects.toThrow('Private');
  });
});

const imageResponse = (bytes: number, type = 'image/jpeg', headers: Record<string, string> = {}) =>
  new Response(new Uint8Array(bytes), {
    status: 200,
    headers: { 'content-type': type, ...headers },
  });

describe('fetchPublicImage', () => {
  it('downloads a public JPEG', async () => {
    const image = await fetchPublicImage('https://cdn.example/cat.jpg', {
      lookup: publicDns,
      fetchImpl: async () => imageResponse(1234),
    });
    expect(image.mimeType).toBe('image/jpeg');
    expect(image.bytes.byteLength).toBe(1234);
  });

  it('re-checks redirects, so a redirect to a private address is blocked', async () => {
    const lookup: Lookup = async (host) =>
      host === 'evil.example' ? ['10.0.0.1'] : ['93.184.216.34'];
    const fetchImpl = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://evil.example/x.jpg' },
      })) as typeof fetch;
    await expect(
      fetchPublicImage('https://cdn.example/cat.jpg', { lookup, fetchImpl }),
    ).rejects.toThrow('Private');
  });

  it('refuses SVG, GIF and HTML', async () => {
    for (const type of ['image/svg+xml', 'image/gif', 'text/html']) {
      await expect(
        fetchPublicImage('https://cdn.example/x', {
          lookup: publicDns,
          fetchImpl: async () => imageResponse(10, type),
        }),
      ).rejects.toThrow('Only JPEG, PNG and WebP');
    }
  });

  it('enforces the size cap even when Content-Length lies', async () => {
    const big = MAX_IMAGE_BYTES + 1;
    await expect(
      fetchPublicImage('https://cdn.example/x', {
        lookup: publicDns,
        fetchImpl: async () => imageResponse(big),
      }),
    ).rejects.toThrow('too large');
    await expect(
      fetchPublicImage('https://cdn.example/x', {
        lookup: publicDns,
        fetchImpl: async () => imageResponse(10, 'image/png', { 'content-length': String(big) }),
      }),
    ).rejects.toThrow('too large');
  });
});
