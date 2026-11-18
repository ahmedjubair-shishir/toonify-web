import type { Page } from '@playwright/test';
import { expect, openPopup, openTab, siteSwitch, test } from './fixtures';

const style = (page: Page, selector: string, property: string, pseudo?: string) =>
  page
    .locator(selector)
    .evaluate(
      (el, [prop, pse]) => getComputedStyle(el, pse ?? null).getPropertyValue(prop as string),
      [property, pseudo] as const,
    );
const effectSwitch = (popup: Page, label: string) => popup.getByRole('switch', { name: label });

test.describe('Effects (per site, live, reversible)', () => {
  test('each effect switches on and off from the popup', async ({
    context,
    worker,
    extensionId,
  }) => {
    const { page, tabId } = await openTab(context, worker, 'http://localhost:4173/theme.html');
    const popup = await openPopup(context, extensionId, tabId);
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => page.locator('#photo').getAttribute('data-toonify')).toBe('media');
    await popup.getByRole('tab', { name: /Effects/ }).click();
    for (const label of [
      'Hand-drawn lines',
      'Sticker photos',
      'Bouncy buttons',
      'Playful headings',
      'Comic background',
    ]) {
      await expect(effectSwitch(popup, label)).toHaveAttribute('aria-checked', 'false');
    }
    const plainButtonBg = await style(page, '#text-button', 'background-image');

    // Hand-drawn lines
    await effectSwitch(popup, 'Hand-drawn lines').click();
    await expect
      .poll(() => style(page, '#text-button', 'background-image'))
      .toContain('data:image/svg+xml');
    expect(await style(page, '#photo', 'filter')).toContain('url("#toonify-web-sketch")');
    expect(await page.locator('#toonify-web-filters #toonify-web-sketch').count()).toBe(1);
    expect(await style(page, '#link', 'text-decoration-style')).toBe('wavy');

    // Sticker photos
    await effectSwitch(popup, 'Sticker photos').click();
    await expect.poll(() => style(page, '#photo', 'transform')).not.toBe('none');
    expect(await style(page, '#photo', 'box-shadow')).toContain('rgb(255, 255, 255)');

    // Bouncy buttons (reacts on hover)
    await effectSwitch(popup, 'Bouncy buttons').click();
    await page.bringToFront();
    await page.locator('#text-button').hover();
    await expect.poll(() => style(page, '#text-button', 'transform')).not.toBe('none');

    // Playful headings: Latin headings only, font really loads
    await effectSwitch(popup, 'Playful headings').click();
    await expect.poll(() => page.locator('h1').getAttribute('data-toonify')).toBe('heading');
    await expect.poll(() => style(page, 'h1', 'font-family')).toContain('Toonify Fredoka');
    expect(await page.locator('#bn-heading').getAttribute('data-toonify')).toBeNull();
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await document.fonts.ready, document.fonts.check('32px "Toonify Fredoka"')),
        ),
      )
      .toBe(true);

    // Comic background: drawn over the page but never blocks clicks
    await effectSwitch(popup, 'Comic background').click();
    await expect
      .poll(() => style(page, 'html', 'background-image', '::after'))
      .toContain('linear-gradient');
    expect(await style(page, 'html', 'pointer-events', '::after')).toBe('none');
    expect(await page.evaluate(() => document.elementFromPoint(40, 40)?.tagName)).not.toBe('HTML');
    await page.locator('#text-button').click(); // still clickable

    // Saved per site: survives reload
    await page.reload();
    await expect
      .poll(() => style(page, '#text-button', 'background-image'))
      .toContain('data:image/svg+xml');

    // Off again one by one, then the whole site off: nothing left behind
    await effectSwitch(popup, 'Hand-drawn lines').click();
    await expect.poll(() => style(page, '#text-button', 'background-image')).toBe(plainButtonBg);
    await expect.poll(() => page.locator('#toonify-web-sketch').count()).toBe(0);
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => style(page, 'html', 'background-image', '::after')).toBe('none');
    expect(await style(page, '#photo', 'transform')).toBe('none');
    expect(
      await page.evaluate(() =>
        document.documentElement.getAttributeNames().filter((n) => n.startsWith('data-toonify')),
      ),
    ).toEqual([]);
  });

  test('works under a strict site security policy (fonts and sketch lines)', async ({
    context,
    worker,
  }) => {
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        settings: {
          globalEnabled: true,
          sites: { localhost: { enabled: true, effects: { headings: true, sketch: true } } },
          aiConsent: false,
          aiTool: 'off',
        },
      });
    });
    const { page } = await openTab(context, worker, 'http://localhost:4173/csp-theme.html');
    await expect.poll(() => style(page, 'h1', 'font-family')).toContain('Toonify Fredoka');
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await document.fonts.ready, document.fonts.check('32px "Toonify Fredoka"')),
        ),
      )
      .toBe(true);
    await expect
      .poll(() => style(page, '#text-button', 'background-image'))
      .toContain('data:image/svg+xml');
  });

  test('dark pages get light ink', async ({ context, worker }) => {
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        settings: {
          globalEnabled: true,
          sites: { localhost: { enabled: true, effects: { sketch: true } } },
          aiConsent: false,
          aiTool: 'off',
        },
      });
    });
    const { page } = await openTab(context, worker, 'http://localhost:4173/dark.html');
    await expect.poll(() => page.locator('html').getAttribute('data-toonify-scheme')).toBe('dark');
    await expect.poll(() => style(page, '#dark-button', 'background-image')).toContain('f3f1ff');
  });
});
