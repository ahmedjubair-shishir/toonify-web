import type { Page, Worker } from '@playwright/test';
import { expect, openPopup, openTab, test } from './fixtures';
import { decodePng } from './png';

const MARK = 'data-toonify-icon';
const mark = (page: Page, selector: string) => page.locator(selector).getAttribute(MARK);
const style = (page: Page, selector: string, property: string) =>
  page
    .locator(selector)
    .evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);

async function preset(worker: Worker, site: Record<string, unknown>) {
  await worker.evaluate(async (entry) => {
    await chrome.storage.local.set({
      settings: {
        globalEnabled: true,
        sites: { localhost: entry },
        aiConsent: false,
        aiTool: 'off',
      },
    });
  }, site);
}

/**
 * Counts red and blue pixels in a screenshot of one element. Red = the
 * swapped icon (text colour), blue = the site's original drawing.
 */
async function colours(page: Page, selector: string) {
  const { rgba } = decodePng(await page.locator(selector).screenshot());
  let red = 0;
  let blue = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const [r = 0, g = 0, b = 0] = [rgba[i], rgba[i + 1], rgba[i + 2]];
    if (r > 180 && g < 90 && b < 90) red++;
    if (b > 180 && r < 90 && g < 90) blue++;
  }
  return { red, blue, total: rgba.length / 4 };
}

const rects = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.row > *')].map((el) => {
      const r = el.getBoundingClientRect();
      return [el.id, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    }),
  );

test.describe('Icons (find, swap, looks)', () => {
  test('finds icons and their meaning, swaps known ones, keeps layout', async ({
    context,
    worker,
  }) => {
    await preset(worker, { enabled: true });
    const { page } = await openTab(context, worker, 'http://localhost:4173/icons.html');
    await expect.poll(() => page.locator('#photo').getAttribute('data-toonify')).toBe('media');
    // Feature off by default: icons are not even looked for.
    expect(await page.locator(`[${MARK}]`).count()).toBe(0);
    const before = await rects(page);
    const original = await colours(page, '#big');
    expect(original.blue).toBeGreaterThan(original.total * 0.8);

    await preset(worker, { enabled: true, iconSet: 'lucide' });
    await expect.poll(() => mark(page, '#fa')).toBe('search');
    expect(await mark(page, '#labelled')).toBe('settings');
    expect(await mark(page, '#in-button')).toBe('close');
    expect(await mark(page, '#small-img')).toBe('heart');
    expect(await mark(page, '#ligature')).toBe('play');
    expect(await mark(page, '#unknown')).toBe('other');
    expect(await mark(page, '#chevron')).toBe('chevron-down');
    expect(await mark(page, '#big')).toBe('home');
    expect(await mark(page, '#italic')).toBeNull();
    expect(await mark(page, '#photo')).toBeNull();

    // Known icons are redrawn; unknown ones keep their drawing.
    expect(await style(page, '#labelled', 'mask-image')).toMatch(
      /chrome-extension:\/\/[a-z]+\/icons\/lucide\/plain\/settings\.svg/,
    );
    expect(await style(page, '#unknown', 'mask-image')).toBe('none');
    expect(
      await page.locator('#labelled circle').evaluate((c) => getComputedStyle(c).visibility),
    ).toBe('hidden');
    expect(
      await page.locator('#unknown circle').evaluate((c) => getComputedStyle(c).visibility),
    ).toBe('visible');
    expect(await style(page, '#fa', '-webkit-text-fill-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await style(page, '#small-img', 'object-position')).toContain('-99999px');
    // The site's own transform (a flipped chevron) is untouched.
    expect(await style(page, '#chevron', 'transform')).not.toBe('none');

    // Really drawn: the old blue square is gone, a red (text colour) icon is there.
    await expect.poll(async () => (await colours(page, '#big')).red).toBeGreaterThan(20);
    const swapped = await colours(page, '#big');
    expect(swapped.blue).toBe(0);
    expect(swapped.red).toBeLessThan(swapped.total * 0.6); // an outline, not a solid box

    // Nothing moved.
    expect(await rects(page)).toEqual(before);

    // A class change (play -> pause) updates the icon.
    await page.locator('#toggle').evaluate((el) => el.setAttribute('class', 'fa fa-pause'));
    await expect.poll(() => mark(page, '#toggle')).toBe('pause');

    // Back to the site's own icons: marks and drawing restored.
    await preset(worker, { enabled: true, iconSet: 'original' });
    await expect.poll(() => page.locator(`[${MARK}]`).count()).toBe(0);
    await expect
      .poll(async () => (await colours(page, '#big')).blue)
      .toBeGreaterThan(original.total * 0.8);
  });

  test('looks: sketched adds the icon filter, animated respects reduced motion', async ({
    context,
    worker,
  }) => {
    await preset(worker, { enabled: true, iconLook: 'sketch' });
    const { page } = await openTab(context, worker, 'http://localhost:4173/icons.html');
    await expect.poll(() => mark(page, '#unknown')).toBe('other');
    expect(await style(page, '#unknown', 'filter')).toContain('toonify-web-icon-sketch');
    expect(await page.locator('#toonify-web-icon-sketch').count()).toBe(1);

    await preset(worker, { enabled: true, iconSet: 'phosphor', iconLook: 'animated' });
    await expect.poll(() => page.locator('#toonify-web-icon-sketch').count()).toBe(0);
    await page.bringToFront();
    await page.locator('#icon-button').hover();
    await expect
      .poll(() => style(page, '#in-button', 'animation-name'))
      .toBe('toonify-icon-wiggle');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => style(page, '#in-button', 'animation-name')).toBe('none');
  });

  test('popup: pick a set and a look, saved per site', async ({ context, worker, extensionId }) => {
    await preset(worker, { enabled: true });
    const { page, tabId } = await openTab(context, worker, 'http://localhost:4173/icons.html');
    const popup = await openPopup(context, extensionId, tabId);
    const sets = popup.getByRole('group', { name: 'Set' });
    const looks = popup.getByRole('group', { name: 'Look' });
    await expect(sets.getByRole('radio', { name: 'Original' })).toBeChecked();
    await expect(looks.getByRole('radio', { name: 'Plain' })).toBeChecked();

    await sets.getByText('Tabler', { exact: true }).click();
    await expect.poll(() => mark(page, '#labelled')).toBe('settings');
    await looks.getByText('Cartoon', { exact: true }).click();
    await expect
      .poll(() =>
        worker.evaluate(async () => {
          const { settings } = (await chrome.storage.local.get('settings')) as {
            settings: { sites: Record<string, unknown> };
          };
          return settings.sites.localhost;
        }),
      )
      .toEqual({ enabled: true, iconSet: 'tabler', iconLook: 'cartoon' });
    expect(await style(page, '#unknown', 'filter')).toContain('drop-shadow');

    // Keyboard: arrows move between looks.
    await looks.getByRole('radio', { name: 'Cartoon' }).focus();
    await popup.keyboard.press('ArrowRight');
    await expect(looks.getByRole('radio', { name: 'Sketched' })).toBeChecked();
    await expect(looks.getByRole('radio', { name: 'Sketched' })).toBeFocused();
  });

  test('strict site security policy: swapped icons still draw', async ({ context, worker }) => {
    await preset(worker, { enabled: true, iconSet: 'lucide' });
    const { page } = await openTab(context, worker, 'http://localhost:4173/csp-icons.html');
    await expect.poll(() => mark(page, '#big')).toBe('home');
    await expect.poll(async () => (await colours(page, '#big')).red).toBeGreaterThan(20);
    const drawn = await colours(page, '#big');
    expect(drawn.red).toBeLessThan(drawn.total * 0.6); // not a solid square (mask loaded)
  });
});
