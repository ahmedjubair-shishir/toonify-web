/**
 * A "site" is the host name of a page, without a leading "www.".
 * wikipedia.org and www.wikipedia.org are the same site;
 * bn.wikipedia.org is a different site (precise and predictable for users).
 *
 * Only http and https pages can be sites. Everything else returns null.
 */
export type SiteKey = string & { readonly __brand: 'SiteKey' };

export function siteKeyFromUrl(url: string | undefined): SiteKey | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase();
  if (host === '') return null;
  return host.replace(/^www\./, '') as SiteKey;
}

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
}

/**
 * Match patterns that cover a site. `*://` means http and https; match
 * patterns ignore ports, so localhost:4173 is covered by `*://localhost/*`.
 */
export function originsForSite(site: SiteKey): string[] {
  const origins = [`*://${site}/*`];
  if (!isIpAddress(site) && site !== 'localhost' && site.includes('.')) {
    origins.push(`*://www.${site}/*`);
  }
  return origins;
}

/** Turns a granted match pattern back into a site key (or null if not one of ours). */
export function siteKeyFromOrigin(pattern: string): SiteKey | null {
  const match = /^(\*|https?):\/\/([^/]+)\/\*$/.exec(pattern);
  if (!match?.[2] || match[2].includes('*')) return null;
  return match[2].toLowerCase().replace(/^www\./, '') as SiteKey;
}
