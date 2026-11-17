import { browser } from '#imports';
import { getAiTool } from '@/core/ai-tools';
import type { Message, Response, Sender } from '@/core/messaging';
import { getSettings, isSiteActive } from '@/core/settings';
import { siteKeyFromUrl } from '@/core/site';
import { bytesToBase64 } from './cartoonize';

const MAX_BYTES = 8 * 1024 * 1024;

/** Only our content script, in a tab on a site where Toonify is on. */
async function fromActiveSite(sender: Sender): Promise<boolean> {
  const site = siteKeyFromUrl(sender.tab?.url ?? '');
  return site !== null && isSiteActive(await getSettings(), site);
}

/**
 * Opens the user's chosen AI app. The URL comes from our own list, never
 * from the page, so a page can't use this to open arbitrary tabs.
 */
export async function openAiApp(
  message: Message<'toonify/open-ai-app'>,
  sender: Sender,
): Promise<Response<'toonify/open-ai-app'>> {
  if (!(await fromActiveSite(sender))) return { ok: false };
  const settings = await getSettings();
  const tool = getAiTool(settings.aiTool);
  if (tool.id !== message.tool || tool.kind !== 'account' || !tool.appUrl) return { ok: false };
  await browser.tabs.create({
    url: tool.appUrl,
    active: true,
    ...(sender.tab?.id !== undefined ? { openerTabId: sender.tab.id } : {}),
  });
  return { ok: true };
}

/**
 * Downloads an image for the handoff copy when the page's server doesn't
 * allow the content script to read it. Only raster images, size-capped;
 * the bytes go back to our content script only (never to the page).
 */
export async function fetchImage(
  message: Message<'toonify/fetch-image'>,
  sender: Sender,
  fetchImpl: typeof fetch = fetch,
): Promise<Response<'toonify/fetch-image'>> {
  if (!(await fromActiveSite(sender))) return { ok: false };
  if (typeof message.url !== 'string' || !/^https?:\/\//.test(message.url)) return { ok: false };
  try {
    const response = await fetchImpl(message.url, {
      credentials: 'omit',
      signal: AbortSignal.timeout(15_000),
    });
    const mimeType = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
    if (!response.ok || !/^image\/(jpeg|png|webp|gif|avif)$/.test(mimeType)) return { ok: false };
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return { ok: false };
    return { ok: true, mimeType, base64: bytesToBase64(bytes) };
  } catch {
    return { ok: false };
  }
}
