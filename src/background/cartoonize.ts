import { CARTOONIZE_URL } from '@/core/config';
import { getInstallId } from '@/core/install-id';
import type { CartoonizeResult, Message, Sender } from '@/core/messaging';
import { getSettings, isSiteActive } from '@/core/settings';
import { siteKeyFromUrl } from '@/core/site';
import { getTheme } from '@/core/themes';

const fail = (code: string, message: string): CartoonizeResult => ({ ok: false, code, message });

/** Base64 in chunks: one big String.fromCharCode(...bytes) overflows the stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Background side of "Cartoonize". Every rule is checked here, not only in the
 * page, because a page could try to message the extension:
 * - sent by our content script in a real tab, on a site that is on
 * - the user gave AI consent
 * - the image is a normal web address
 * Only then is the image address (not the page) sent to the owner's server.
 */
export async function cartoonize(
  message: Message<'toonify/cartoonize'>,
  sender: Sender,
  { fetchImpl = fetch, url = CARTOONIZE_URL }: { fetchImpl?: typeof fetch; url?: string } = {},
): Promise<CartoonizeResult> {
  if (!/^https?:\/\//.test(url))
    return fail('unavailable', 'Cartoonize isn’t available in this version.');

  const site = siteKeyFromUrl(sender.tab?.url ?? '');
  const settings = await getSettings();
  if (site === null || !isSiteActive(settings, site))
    return fail('site-off', 'Toonify is off for this site.');
  if (!settings.aiConsent) return fail('consent', 'Please allow AI cartoonizing first.');

  const { imageUrl, width, height } = message;
  if (typeof imageUrl !== 'string' || !/^https?:\/\//.test(imageUrl) || imageUrl.length > 4096) {
    return fail('image', 'This image can’t be cartoonized.');
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-toonify-install': await getInstallId() },
      body: JSON.stringify({
        imageUrl,
        style: getTheme(settings.sites[site]?.theme).id,
        width: Math.round(Number(width) || 0),
        height: Math.round(Number(height) || 0),
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return fail('network', 'Couldn’t reach Toonify’s AI service. Check your connection.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: unknown; message?: unknown };
    } | null;
    const code = typeof body?.error?.code === 'string' ? body.error.code : 'server';
    const text =
      typeof body?.error?.message === 'string'
        ? body.error.message.slice(0, 200)
        : 'Something went wrong. Please try again.';
    return fail(code, text);
  }

  const mimeType = (response.headers.get('content-type') ?? '').split(';')[0] ?? '';
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType))
    return fail('server', 'Something went wrong. Please try again.');
  return {
    ok: true,
    mimeType,
    base64: bytesToBase64(new Uint8Array(await response.arrayBuffer())),
  };
}
