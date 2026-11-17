import type { Page } from '@playwright/test';
import { expect, openPopup, openTab, siteSwitch, test } from './fixtures';

const PAGE = 'http://localhost:4173/theme.html';
const FAKE = 'http://localhost:4174';
const ORIGINAL = 'http://127.0.0.1:4173/photo.svg';

const chip = (page: Page) => page.locator('toonify-web-ui').locator('button.chip');
const dialog = (page: Page) => page.locator('toonify-web-ui').locator('dialog');
const photo = (page: Page) => page.locator('#cdn-photo');
const sentRequests = async () =>
  (await (await fetch(`${FAKE}/__requests`)).json()) as {
    origin: string;
    install: string;
    body: Record<string, unknown>;
  }[];

test.beforeEach(async () => {
  await fetch(`${FAKE}/__reset`);
});

test.describe('AI Cartoonize (fake server)', () => {
  test('asks consent first, swaps the photo, can show the original, and restores on turning off', async ({
    context,
    worker,
    extensionId,
  }) => {
    const { page, tabId } = await openTab(context, worker, PAGE);
    const popup = await openPopup(context, extensionId, tabId);
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => photo(page).getAttribute('data-toonify')).toBe('media');
    await page.bringToFront();
    const before = await photo(page).screenshot();

    // Hover shows the chip; icons and buttons never get one.
    await page.locator('#icon').hover();
    await expect(chip(page)).toBeHidden();
    await photo(page).hover();
    await expect(chip(page)).toHaveText('Cartoonize');

    // First click: consent dialog. Declining sends nothing.
    await chip(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole('heading')).toHaveText('Cartoonize with AI?');
    await expect(dialog(page).getByRole('button', { name: 'Not now' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    expect(await sentRequests()).toHaveLength(0);
    expect(
      await worker.evaluate(
        async () =>
          (
            (await chrome.storage.local.get('settings')).settings as
              { aiConsent?: boolean } | undefined
          )?.aiConsent,
      ),
    ).not.toBe(true);

    // Allow: the image is sent and replaced by the cartoon.
    await photo(page).hover();
    await chip(page).click();
    await dialog(page).getByRole('button', { name: 'Allow and cartoonize' }).click();
    await expect(photo(page)).toHaveAttribute('data-toonify-cartoon', '');
    await expect(photo(page)).toHaveAttribute('src', /^blob:/);
    await expect(chip(page)).toHaveText('Show original');
    expect(Buffer.compare(await photo(page).screenshot(), before)).not.toBe(0);

    const [sent] = await sentRequests();
    expect(sent?.origin).toBe(`chrome-extension://${extensionId}`);
    expect(sent?.install).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent?.body).toEqual({
      imageUrl: ORIGINAL,
      style: 'classic-cartoon',
      width: 400,
      height: 240,
    });

    // Show original, then cartoonize again: no second consent question.
    await chip(page).click();
    await expect(photo(page)).toHaveAttribute('src', ORIGINAL);
    await expect(photo(page)).not.toHaveAttribute('data-toonify-cartoon', '');
    await chip(page).click();
    await expect(dialog(page)).toBeHidden();
    await expect(photo(page)).toHaveAttribute('src', /^blob:/);
    expect(await sentRequests()).toHaveLength(2);

    // Turning the site off restores every original and removes the chip.
    await siteSwitch(popup, 'localhost').click();
    await expect(photo(page)).toHaveAttribute('src', ORIGINAL);
    await expect(page.locator('toonify-web-ui')).toHaveCount(0);
  });

  test('shows the server’s message when it refuses, and leaves the photo alone', async ({
    context,
    worker,
    extensionId,
  }) => {
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        settings: { globalEnabled: true, sites: {}, aiConsent: true },
      });
    });
    await fetch(`${FAKE}/__fail`);
    const { page, tabId } = await openTab(context, worker, PAGE);
    const popup = await openPopup(context, extensionId, tabId);
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => photo(page).getAttribute('data-toonify')).toBe('media');
    await page.bringToFront();

    await photo(page).hover();
    await chip(page).click();
    await expect(chip(page)).toContainText('Please try again in an hour');
    await expect(photo(page)).toHaveAttribute('src', ORIGINAL);
  });

  test('a page script cannot trigger an upload by clicking for the user', async ({
    context,
    worker,
    extensionId,
  }) => {
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        settings: { globalEnabled: true, sites: {}, aiConsent: true },
      });
    });
    const { page, tabId } = await openTab(context, worker, PAGE);
    const popup = await openPopup(context, extensionId, tabId);
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => photo(page).getAttribute('data-toonify')).toBe('media');
    await page.bringToFront();
    await photo(page).hover();
    await expect(chip(page)).toBeVisible();

    // Simulates a hostile page: synthetic clicks are ignored.
    await chip(page).dispatchEvent('click');
    await page.waitForTimeout(500);
    expect(await sentRequests()).toHaveLength(0);
    await expect(photo(page)).toHaveAttribute('src', ORIGINAL);
  });
});
