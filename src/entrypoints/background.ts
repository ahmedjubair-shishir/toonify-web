import { browser, defineBackground } from '#imports';
import { cartoonize } from '@/background/cartoonize';
import { injectIntoOpenTabs, syncContentScripts } from '@/background/content-registration';
import { fetchImage, openAiApp } from '@/background/handoff';
import { onMessages } from '@/core/messaging';
import { removeLegacyKeys, setSiteEnabled, updateSettings, withoutSites } from '@/core/settings';
import { originsForSite, siteKeyFromOrigin, type SiteKey } from '@/core/site';

/**
 * Background service worker. Chrome stops it when idle and restarts it on
 * demand: all listeners are registered synchronously at the top level, and
 * all state lives in storage or in the browser's permission list.
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await removeLegacyKeys();
    await syncContentScripts();
  });

  browser.runtime.onStartup.addListener(() => {
    void syncContentScripts();
  });

  // The user allowed one or more sites (from the popup's "Allow" button).
  browser.permissions.onAdded.addListener(async ({ origins = [] }) => {
    const sites = new Set(origins.map(siteKeyFromOrigin).filter((s): s is SiteKey => s !== null));
    for (const site of sites) await setSiteEnabled(site, true);
    await syncContentScripts();
    await injectIntoOpenTabs(origins);
  });

  // Access removed (Reset site, or the user revoked it in Chrome's settings).
  browser.permissions.onRemoved.addListener(async ({ origins = [] }) => {
    const sites = new Set(origins.map(siteKeyFromOrigin).filter((s): s is SiteKey => s !== null));
    await updateSettings((settings) => {
      settings.sites = withoutSites(settings.sites, sites);
    });
    await syncContentScripts();
  });

  onMessages({
    // Backup path if the popup stayed open after Chrome's prompt.
    'toonify/site-allowed': async ({ site }) => {
      await setSiteEnabled(site, true);
      await syncContentScripts();
      return { injectedTabs: await injectIntoOpenTabs(originsForSite(site)) };
    },
    // Content script asks to redraw one image (all checks happen inside).
    'toonify/cartoonize': (message, sender) => cartoonize(message, sender),
    // Account handoff (Gemini / ChatGPT app): open the app, fetch an image.
    'toonify/open-ai-app': (message, sender) => openAiApp(message, sender),
    'toonify/fetch-image': (message, sender) => fetchImage(message, sender),
  });
});
