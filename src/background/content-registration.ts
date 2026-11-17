import { browser } from '#imports';
import { getGrantedOrigins } from '@/core/permissions';

const SCRIPT_ID = 'toonify-content';
// registerContentScripts takes a path relative to the extension root;
// executeScript's typed API wants the same path with a leading slash.
const SCRIPT_FILE = 'content-scripts/content.js';
const SCRIPT_PUBLIC_PATH = '/content-scripts/content.js';

/**
 * Keeps one registered content script whose `matches` equal the sites the
 * user has allowed. Called on install, browser start-up and every permission
 * change, so new tabs on allowed sites get Toonify automatically.
 */
export async function syncContentScripts(): Promise<string[]> {
  const origins = await getGrantedOrigins();
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });

  if (origins.length === 0) {
    if (existing.length > 0) await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    return origins;
  }

  const script = {
    id: SCRIPT_ID,
    js: [SCRIPT_FILE],
    matches: origins,
    runAt: 'document_start' as const,
    persistAcrossSessions: true,
  };

  if (existing.length > 0) await browser.scripting.updateContentScripts([script]);
  else await browser.scripting.registerContentScripts([script]);
  return origins;
}

/**
 * Registered scripts only run on pages loaded afterwards. Tabs that are
 * already open on a newly allowed site get the script injected right away.
 * The content script ignores a second injection, so this is always safe.
 */
export async function injectIntoOpenTabs(origins: string[]): Promise<number> {
  if (origins.length === 0) return 0;
  const tabs = await browser.tabs.query({ url: origins });
  let injected = 0;
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) return;
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: [SCRIPT_PUBLIC_PATH],
        });
        injected += 1;
      } catch {
        // Tab closed, discarded or not scriptable: it will get the script on next load.
      }
    }),
  );
  return injected;
}
