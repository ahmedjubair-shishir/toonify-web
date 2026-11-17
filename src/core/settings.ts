import { storage } from '#imports';
import type { SiteKey } from './site';

/**
 * Everything Toonify remembers, in one object (spec 5.6).
 * Only what the product needs: no history, no page content, no full URLs.
 */
export interface SiteSettings {
  /** The user allowed this site and wants Toonify on it. */
  enabled: boolean;
  /** Chosen style for this site (a theme id). Missing = the default style. */
  theme?: string;
}

/** Theme ids are short kebab-case names; anything else is ignored. */
const THEME_ID = /^[a-z0-9-]{1,64}$/;

export interface Settings {
  /** Master switch in the popup header ("On" / "Paused"). */
  globalEnabled: boolean;
  /** Per-site choices, keyed by site (host without "www."). */
  sites: Record<string, SiteSettings>;
  /**
   * The user agreed that images they choose to cartoonize are sent to the AI
   * service (spec: explicit consent before any upload). Off until they agree.
   */
  aiConsent: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  globalEnabled: true,
  sites: {},
  aiConsent: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Stored data is untrusted (older versions, manual edits, corruption).
 * Keep every valid field, drop anything invalid, never throw.
 */
export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return structuredClone(DEFAULT_SETTINGS);

  const globalEnabled =
    typeof raw.globalEnabled === 'boolean' ? raw.globalEnabled : DEFAULT_SETTINGS.globalEnabled;

  const sites: Record<string, SiteSettings> = {};
  if (isRecord(raw.sites)) {
    for (const [key, value] of Object.entries(raw.sites)) {
      if (
        key.length > 0 &&
        key.length <= 253 &&
        isRecord(value) &&
        typeof value.enabled === 'boolean'
      ) {
        sites[key] =
          typeof value.theme === 'string' && THEME_ID.test(value.theme)
            ? { enabled: value.enabled, theme: value.theme }
            : { enabled: value.enabled };
      }
    }
  }

  const aiConsent = raw.aiConsent === true;

  return { globalEnabled, sites, aiConsent };
}

/** Is Toonify meant to style this site right now? */
export function isSiteActive(settings: Settings, site: SiteKey): boolean {
  return settings.globalEnabled && settings.sites[site]?.enabled === true;
}

const settingsItem = storage.defineItem<unknown>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});

export async function getSettings(): Promise<Settings> {
  return parseSettings(await settingsItem.getValue());
}

export function watchSettings(callback: (settings: Settings) => void): () => void {
  return settingsItem.watch((value) => callback(parseSettings(value)));
}

/** Read, change and save in one step. Returns the saved settings. */
export async function updateSettings(change: (draft: Settings) => void): Promise<Settings> {
  const draft = await getSettings();
  change(draft);
  const next = parseSettings(draft);
  await settingsItem.setValue(next);
  return next;
}

export const setGlobalEnabled = (enabled: boolean) =>
  updateSettings((s) => {
    s.globalEnabled = enabled;
  });

export const setAiConsent = (consent: boolean) =>
  updateSettings((s) => {
    s.aiConsent = consent;
  });

/** Turns a site on or off, keeping its chosen style. */
export const setSiteEnabled = (site: SiteKey, enabled: boolean) =>
  updateSettings((s) => {
    s.sites[site] = { ...s.sites[site], enabled };
  });

/** Picks the style for a site. Does not turn the site on or off. */
export const setSiteTheme = (site: SiteKey, theme: string) =>
  updateSettings((s) => {
    s.sites[site] = { enabled: s.sites[site]?.enabled ?? false, theme };
  });

/** Returns a copy of `sites` without the given keys. */
export function withoutSites(
  sites: Record<string, SiteSettings>,
  remove: Iterable<string>,
): Record<string, SiteSettings> {
  const removeSet = new Set(remove);
  return Object.fromEntries(Object.entries(sites).filter(([key]) => !removeSet.has(key)));
}

export const forgetSite = (site: SiteKey) =>
  updateSettings((s) => {
    s.sites = withoutSites(s.sites, [site]);
  });

/** Milestone 0 stored a single boolean. Remove it so nothing reads stale data. */
export async function removeLegacyKeys(): Promise<void> {
  await storage.removeItem('local:enabled');
}
