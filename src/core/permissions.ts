import { browser } from '#imports';
import { originsForSite, siteKeyFromOrigin, type SiteKey } from './site';

/**
 * Per-site access uses Chrome's optional host permissions (spec 11:
 * "prefer optional host permissions and user-initiated access").
 * Nothing is granted at install, so Chrome shows no broad warning.
 */

export async function hasSiteAccess(site: SiteKey): Promise<boolean> {
  return browser.permissions.contains({ origins: originsForSite(site) });
}

/**
 * Must be called directly from a user click (Chrome requires a user gesture).
 * Chrome may close the popup while its prompt is open; the background script
 * finishes the job via permissions.onAdded, so nothing depends on this promise.
 */
export async function requestSiteAccess(site: SiteKey): Promise<boolean> {
  return browser.permissions.request({ origins: originsForSite(site) });
}

export async function removeSiteAccess(site: SiteKey): Promise<boolean> {
  return browser.permissions.remove({ origins: originsForSite(site) });
}

/** All host patterns the user has granted (http/https sites only). */
export async function getGrantedOrigins(): Promise<string[]> {
  const { origins = [] } = await browser.permissions.getAll();
  return origins.filter((origin) => siteKeyFromOrigin(origin) !== null);
}
