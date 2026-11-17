import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  DEFAULT_SETTINGS,
  forgetSite,
  getSettings,
  isSiteActive,
  parseSettings,
  setGlobalEnabled,
  setSiteEnabled,
  watchSettings,
  withoutSites,
} from '@/core/settings';
import type { SiteKey } from '@/core/site';

const wiki = 'wikipedia.org' as SiteKey;
const youtube = 'youtube.com' as SiteKey;

describe('parseSettings (untrusted stored data)', () => {
  it.each([undefined, null, 42, 'text', [], { globalEnabled: 'yes' }])(
    'falls back to defaults for %j',
    (raw) => {
      expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
    },
  );

  it('keeps valid sites and drops broken ones', () => {
    const parsed = parseSettings({
      globalEnabled: false,
      sites: {
        'wikipedia.org': { enabled: true },
        'broken.com': { enabled: 'yes' },
        'null.com': null,
        '': { enabled: true },
      },
      unknownField: 'ignored',
    });
    expect(parsed).toEqual({ globalEnabled: false, sites: { 'wikipedia.org': { enabled: true } } });
  });

  it('returns a fresh object, never the shared default', () => {
    const a = parseSettings(undefined);
    a.sites['x.com'] = { enabled: true };
    expect(parseSettings(undefined).sites).toEqual({});
  });
});

describe('isSiteActive', () => {
  it('needs the global switch AND an enabled site', () => {
    const settings = { globalEnabled: true, sites: { [wiki]: { enabled: true } } };
    expect(isSiteActive(settings, wiki)).toBe(true);
    expect(isSiteActive(settings, youtube)).toBe(false); // other sites untouched
    expect(isSiteActive({ ...settings, globalEnabled: false }, wiki)).toBe(false);
    expect(isSiteActive({ globalEnabled: true, sites: { [wiki]: { enabled: false } } }, wiki)).toBe(
      false,
    );
  });
});

describe('withoutSites', () => {
  it('removes only the listed sites', () => {
    expect(withoutSites({ a: { enabled: true }, b: { enabled: false } }, ['a'])).toEqual({
      b: { enabled: false },
    });
  });
});

describe('settings storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('starts with Toonify on globally and no sites allowed', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('remembers per-site choices independently', async () => {
    await setSiteEnabled(wiki, true);
    await setSiteEnabled(youtube, false);
    const settings = await getSettings();
    expect(isSiteActive(settings, wiki)).toBe(true);
    expect(isSiteActive(settings, youtube)).toBe(false);
  });

  it('forgetSite removes a site without touching others', async () => {
    await setSiteEnabled(wiki, true);
    await setSiteEnabled(youtube, true);
    await forgetSite(wiki);
    expect((await getSettings()).sites).toEqual({ [youtube]: { enabled: true } });
  });

  it('notifies watchers with validated settings', async () => {
    const seen: boolean[] = [];
    const unwatch = watchSettings((s) => seen.push(s.globalEnabled));
    await setGlobalEnabled(false);
    expect(seen).toEqual([false]);
    unwatch();
  });
});
