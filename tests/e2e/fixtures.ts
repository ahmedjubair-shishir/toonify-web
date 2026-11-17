import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';
import path from 'node:path';

const extensionPath = path.resolve('.output/chrome-mv3-e2e');

/**
 * Launches Chromium with the e2e build loaded (`npm run test:e2e` builds it).
 * The e2e build pre-allows localhost and 127.0.0.1 because tests cannot click
 * Chrome's permission prompt; 127.0.0.2 stays un-allowed to test "Needs access".
 *
 * CHROME_PATH lets you point at a specific Chromium build. Branded Google
 * Chrome no longer accepts --load-extension; use Playwright's Chromium.
 */
export const test = base.extend<{ context: BrowserContext; worker: Worker; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const executablePath = process.env.CHROME_PATH;
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      ...(executablePath ? { executablePath } : {}),
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  worker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    // Wait until install handling has registered the content script.
    await expect
      .poll(() =>
        worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length),
      )
      .toBe(1);
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
});

export const expect = test.expect;

const allTabIds = (worker: Worker) =>
  worker.evaluate(async () => (await chrome.tabs.query({})).map((tab) => tab.id ?? -1));

/**
 * Opens a page and returns its Chrome tab id (needed because the popup is
 * opened as a tab in tests and must be told which page it is about).
 */
export async function openTab(context: BrowserContext, worker: Worker, url: string) {
  const before = new Set(await allTabIds(worker));
  const page = await context.newPage();
  const after = await allTabIds(worker);
  const tabId = after.find((id) => !before.has(id));
  if (tabId === undefined) throw new Error('Could not find the new tab id');
  await page.goto(url);
  return { page, tabId };
}

/** Opens the popup UI as a tab, pointed at the given page's tab. */
export async function openPopup(context: BrowserContext, extensionId: string, tabId: number) {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${tabId}`);
  return popup;
}

export const styleCount = (page: Page) => page.locator('#toonify-web-style').count();

export const isStyled = (page: Page) =>
  page.evaluate(() => document.documentElement.hasAttribute('data-toonify-active'));

/** Header power button: Toonify on/off for every site (aria-pressed). */
export const globalSwitch = (popup: Page) =>
  popup.getByRole('button', { name: 'Toonify on all sites' });

export const siteSwitch = (popup: Page, site: string) =>
  popup.getByRole('switch', { name: `Toonify on ${site}` });
