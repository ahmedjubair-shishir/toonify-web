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
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        settings: { globalEnabled: true, sites: {}, aiConsent: false, aiTool: 'toonify' },
      });
    });
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
        settings: { globalEnabled: true, sites: {}, aiConsent: true, aiTool: 'toonify' },
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
        settings: { globalEnabled: true, sites: {}, aiConsent: true, aiTool: 'toonify' },
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

  test('Gemini account: picked in the popup, copies picture + instruction and opens Gemini', async ({
    context,
    worker,
    extensionId,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'http://localhost:4173',
    });
    // Stand-in for gemini.google.com (no real Google in tests).
    await context.route('https://gemini.google.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Gemini stand-in</h1>' }),
    );
    const { page, tabId } = await openTab(context, worker, PAGE);
    const popup = await openPopup(context, extensionId, tabId);
    await siteSwitch(popup, 'localhost').click();

    // The popup lists every tool with what it needs; API keys are not ready yet.
    const ai = popup.getByRole('group', { name: 'AI cartoonize' });
    await expect(ai.getByRole('radio', { name: /Off/ })).toBeChecked();
    await expect(ai.getByText('Free or Pro account · you paste')).toBeVisible();
    await expect(ai.getByRole('radio', { name: /Gemini - API key/ })).toBeDisabled();
    await ai.getByRole('radio', { name: /Gemini - my account/ }).check();
    await expect
      .poll(() =>
        worker.evaluate(
          async () =>
            (
              (await chrome.storage.local.get('settings')).settings as
                { aiTool?: string } | undefined
            )?.aiTool,
        ),
      )
      .toBe('gemini-account');

    // Same-origin picture (data: URL here): copied as PNG with the instruction.
    await page.bringToFront();
    await expect.poll(() => page.locator('#photo').getAttribute('data-toonify')).toBe('media');
    await page.locator('#photo').hover();
    await expect(chip(page)).toHaveText('Cartoonize in Gemini');
    // The new tab asks for Gemini (the stand-in page may not render in it).
    const geminiRequest = context.waitForEvent('request', (r) =>
      r.url().startsWith('https://gemini.google.com/app'),
    );
    await chip(page).click();
    expect((await geminiRequest).url()).toBe('https://gemini.google.com/app');

    await page.bringToFront();
    const hint = page.locator('toonify-web-ui').locator('.hint');
    await expect(hint).toContainText('Gemini opened in a new tab');
    await expect(hint).toContainText('picture and the style instruction are copied');
    const clipboard = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return {
        types: item?.types ?? [],
        text: item ? await (await item.getType('text/plain')).text() : '',
      };
    });
    expect(clipboard.types).toEqual(expect.arrayContaining(['image/png', 'text/plain']));
    expect(clipboard.text).toContain('classic cartoon illustration');

    // Nothing was sent to any server, and the photo is unchanged.
    expect(await sentRequests()).toHaveLength(0);
    await expect(page.locator('#photo')).not.toHaveAttribute('data-toonify-cartoon', '');
  });

  test('ChatGPT account: if a site blocks copying the picture, explains the manual way', async ({
    context,
    worker,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'http://localhost:4173',
    });
    await context.route('https://chatgpt.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>ChatGPT stand-in</h1>' }),
    );
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        settings: {
          globalEnabled: true,
          sites: { localhost: { enabled: true, theme: 'comic-book' } },
          aiConsent: false,
          aiTool: 'chatgpt-account',
        },
      });
    });
    const { page } = await openTab(context, worker, PAGE);
    await expect.poll(() => photo(page).getAttribute('data-toonify')).toBe('media');
    await page.bringToFront();

    // An SVG from another site without CORS: the picture can't be copied.
    await photo(page).hover();
    await expect(chip(page)).toHaveText('Cartoonize in ChatGPT');
    const chatRequest = context.waitForEvent('request', (r) =>
      r.url().startsWith('https://chatgpt.com/'),
    );
    await chip(page).click();
    expect((await chatRequest).url()).toBe('https://chatgpt.com/');
    await page.bringToFront();
    const hint = page.locator('toonify-web-ui').locator('.hint');
    await expect(hint).toContainText('doesn’t let Toonify copy the picture');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('comic book panel');

    // "Copy instruction" copies it again; "Done" closes the hint.
    await page.evaluate(() => navigator.clipboard.writeText('something else'));
    await hint.getByRole('button', { name: 'Copy instruction' }).click();
    await expect(hint.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('comic book panel');
    await hint.getByRole('button', { name: 'Done' }).click();
    await expect(hint).toBeHidden();
  });
});
