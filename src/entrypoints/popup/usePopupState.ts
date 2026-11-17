import { useEffect, useState } from 'react';
import { browser } from '#imports';
import { sendToBackground, sendToTab } from '@/core/messaging';
import { hasSiteAccess, removeSiteAccess, requestSiteAccess } from '@/core/permissions';
import { getPageSupport } from '@/core/restricted-pages';
import {
  DEFAULT_SETTINGS,
  forgetSite,
  getSettings,
  isSiteActive,
  setGlobalEnabled,
  setSiteEnabled,
  setSiteTheme,
  watchSettings,
  type Settings,
} from '@/core/settings';
import { siteKeyFromUrl, type SiteKey } from '@/core/site';

/** Which popup screen to show (Figma: Popup page, frames 01 to 10). */
export type PopupView =
  | { kind: 'loading' }
  | { kind: 'restricted' }
  | { kind: 'paused' }
  | { kind: 'needs-access' }
  | { kind: 'site-off' }
  | { kind: 'active'; applied: boolean | null };

interface TabInfo {
  id: number | undefined;
  url: string | undefined;
  favIconUrl: string | undefined;
}

/**
 * e2e builds only: Playwright opens the popup as a normal tab, so "the active
 * tab" would be the popup itself. Tests pass ?tab=<id> to say which page the
 * popup is about. Production builds ignore it.
 */
function testTabOverride(): number | null {
  if (import.meta.env.MODE !== 'e2e') return null;
  const value = Number(new URLSearchParams(location.search).get('tab'));
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function getCurrentTab(): Promise<TabInfo | null> {
  const override = testTabOverride();
  const tab =
    override !== null
      ? await browser.tabs.get(override)
      : (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  return tab ? { id: tab.id, url: tab.url, favIconUrl: tab.favIconUrl } : null;
}

export function usePopupState() {
  const [tab, setTab] = useState<TabInfo | null | undefined>(undefined);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [access, setAccess] = useState<boolean | null>(null);
  const [applied, setApplied] = useState<boolean | null>(null);

  const site: SiteKey | null = siteKeyFromUrl(tab?.url);
  const support = getPageSupport(tab?.url);
  const restricted = tab !== undefined && (site === null || support !== 'supported');

  // Load the tab and settings, and follow settings changes from any tab.
  useEffect(() => {
    void getCurrentTab().then(setTab);
    void getSettings().then(setSettings);
    return watchSettings(setSettings);
  }, []);

  // Does Toonify have permission for this site? Re-check whenever it changes.
  useEffect(() => {
    if (site === null) return; // restricted pages never need access
    let cancelled = false;
    const check = () => {
      void hasSiteAccess(site).then((granted) => {
        if (!cancelled) setAccess(granted);
      });
    };
    check();
    browser.permissions.onAdded.addListener(check);
    browser.permissions.onRemoved.addListener(check);
    return () => {
      cancelled = true;
      browser.permissions.onAdded.removeListener(check);
      browser.permissions.onRemoved.removeListener(check);
    };
  }, [site]);

  const refreshAccess = async () => {
    if (site !== null) setAccess(await hasSiteAccess(site));
  };

  const siteActive = settings !== null && site !== null && isSiteActive(settings, site);

  // When the site should be active, ask the page whether the layer is really on.
  useEffect(() => {
    if (!siteActive || !access || tab?.id === undefined) return;
    const tabId = tab.id;
    let cancelled = false;
    const check = () =>
      sendToTab(tabId, { type: 'toonify/get-status' })
        .then((status) => !cancelled && setApplied(status.applied))
        .catch(() => !cancelled && setApplied(false)); // no content script in this tab yet
    // Give the page a moment to apply after a switch change.
    const timer = setTimeout(() => void check(), 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [siteActive, access, tab?.id, settings]);

  let view: PopupView;
  if (tab === undefined || settings === null || (!restricted && access === null))
    view = { kind: 'loading' };
  else if (restricted) view = { kind: 'restricted' };
  else if (!settings.globalEnabled) view = { kind: 'paused' };
  else if (!access) view = { kind: 'needs-access' };
  else if (!siteActive) view = { kind: 'site-off' };
  else view = { kind: 'active', applied };

  const actions = {
    setGlobalEnabled: (enabled: boolean) => void setGlobalEnabled(enabled),
    setSiteEnabled: (enabled: boolean) => {
      if (site) void setSiteEnabled(site, enabled);
    },
    setSiteTheme: (theme: string) => {
      if (site) void setSiteTheme(site, theme);
    },
    /** Must run directly inside the click handler (Chrome needs a user gesture). */
    allowSite: async () => {
      if (!site) return;
      const granted = await requestSiteAccess(site);
      if (granted) await sendToBackground({ type: 'toonify/site-allowed', site });
      await refreshAccess();
    },
    resetSite: async () => {
      if (!site) return;
      await forgetSite(site); // open tabs remove the layer immediately
      try {
        await removeSiteAccess(site);
      } catch {
        // Chrome refuses to remove permissions that are not optional (e.g. in
        // test builds). The site is already off and forgotten, so carry on.
      }
      await refreshAccess();
    },
    reloadTab: () => {
      if (tab?.id !== undefined) void browser.tabs.reload(tab.id);
      window.close();
    },
  };

  return {
    view,
    site,
    tab: tab ?? null,
    settings: settings ?? DEFAULT_SETTINGS,
    hasAccess: access === true,
    actions,
  };
}
