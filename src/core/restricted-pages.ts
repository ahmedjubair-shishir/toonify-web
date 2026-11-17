/**
 * Browsers block extensions from changing some pages (their own settings
 * pages, new tab pages, extension stores). We detect these so the popup can
 * explain the limitation instead of looking broken.
 */
export type PageSupport = 'supported' | 'browser-page' | 'web-store' | 'unknown';

const BROWSER_PROTOCOLS = new Set([
  'about:',
  'brave:',
  'chrome:',
  'chrome-extension:',
  'chrome-search:',
  'chrome-untrusted:',
  'devtools:',
  'edge:',
  'moz-extension:',
  'opera:',
  'view-source:',
  'vivaldi:',
]);

const WEB_STORE_HOSTS = new Set([
  'chromewebstore.google.com',
  'microsoftedge.microsoft.com',
  'addons.mozilla.org',
]);

export function getPageSupport(url: string | undefined): PageSupport {
  if (!url) return 'unknown';

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'unknown';
  }

  if (BROWSER_PROTOCOLS.has(parsed.protocol)) return 'browser-page';
  if (WEB_STORE_HOSTS.has(parsed.hostname)) return 'web-store';
  // The legacy Chrome Web Store still lives under a path on chrome.google.com.
  if (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore')) {
    return 'web-store';
  }
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return 'supported';

  // file:, data:, blob: and others: only work in special cases, treat as unknown.
  return 'unknown';
}
