import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';

const extensionPath = path.resolve('.output/chrome-mv3');

/**
 * Launches Chromium with the built extension loaded (run `npm run build` first;
 * `npm run test:e2e` does that for you).
 *
 * CHROME_PATH lets you point at a specific Chromium build. Note: branded Google
 * Chrome no longer accepts --load-extension, so use Playwright's Chromium or
 * Chrome for Testing.
 */
export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
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
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    await use(id);
  },
});

export const expect = test.expect;

/** Opens the popup UI as a normal tab (Playwright can't click the toolbar icon). */
export async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  return popup;
}

export const styleCount = (page: Page) => page.locator('#toonify-web-style').count();

export const hasActiveAttribute = (page: Page) =>
  page.evaluate(() => document.documentElement.hasAttribute('data-toonify-active'));
