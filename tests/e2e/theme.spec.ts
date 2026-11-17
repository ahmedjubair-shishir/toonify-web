import { expect, openPopup, openTab, siteSwitch, test } from './fixtures';
import type { Page } from '@playwright/test';

const PAGE = 'http://localhost:4173/theme.html';

const mark = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((el) => el.getAttribute('data-toonify'));
const style = (page: Page, id: string, property: string) =>
  page
    .locator(`#${id}`)
    .evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);
const box = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height].map(Math.round);
  });

test.describe('Milestone 2: Classic Cartoon theme engine', () => {
  test('styles content, skips icons and editors, never moves anything, and cleans up', async ({
    context,
    worker,
    extensionId,
  }) => {
    const { page, tabId } = await openTab(context, worker, PAGE);
    const ids = ['photo', 'text-button', 'search', 'icon-button'];
    const before = await Promise.all(ids.map((id) => box(page, id)));
    const plainShadow = await style(page, 'text-button', 'box-shadow');
    await expect
      .poll(() =>
        page
          .locator('#cdn-photo')
          .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
    const cdnBefore = await page.locator('#cdn-photo').screenshot();
    const iconBefore = await page.locator('#icon').screenshot();

    const popup = await openPopup(context, extensionId, tabId);
    await siteSwitch(popup, 'localhost').click();

    // Content gets marked and styled.
    await expect.poll(() => mark(page, 'photo')).toBe('media');
    expect(await mark(page, 'text-button')).toBe('button');
    expect(await mark(page, 'search')).toBe('field');
    expect(await style(page, 'photo', 'outline-style')).toBe('solid');
    expect(await style(page, 'photo', 'border-radius')).toBe('16px');
    expect(await style(page, 'text-button', 'box-shadow')).not.toBe(plainShadow);

    // Icons, icon-only buttons, checkboxes and editor content are left alone.
    expect(await mark(page, 'icon')).toBeNull();
    expect(await mark(page, 'icon-button')).toBeNull();
    expect(await mark(page, 'check')).toBeNull();
    expect(await mark(page, 'editor-button')).toBeNull();
    expect(await style(page, 'icon', 'outline-style')).toBe('none');

    // Photos are redrawn by the cartoon filter, including images from other
    // sites (CDNs); icons keep their exact pixels.
    expect(await style(page, 'photo', 'filter')).toContain('url("#toonify-web-cartoon")');
    expect(await page.locator('#toonify-web-filters').count()).toBe(1);
    expect(await mark(page, 'cdn-photo')).toBe('media');
    expect(Buffer.compare(await page.locator('#cdn-photo').screenshot(), cdnBefore)).not.toBe(0);
    expect(Buffer.compare(await page.locator('#icon').screenshot(), iconBefore)).toBe(0);

    // Content added later is picked up.
    await expect.poll(() => mark(page, 'late-button')).toBe('button');

    // Nothing moved or resized.
    expect(await Promise.all(ids.map((id) => box(page, id)))).toEqual(before);

    // Keyboard focus shows the site's own focus ring, not our shadow.
    await page.locator('#text-button').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    expect(await style(page, 'text-button', 'box-shadow')).toBe(plainShadow);

    // Turning off removes every mark and style.
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => page.locator('[data-toonify]').count()).toBe(0);
    expect(await page.locator('#toonify-web-filters').count()).toBe(0);
    expect(Buffer.compare(await page.locator('#cdn-photo').screenshot(), cdnBefore)).toBe(0);
    expect(await style(page, 'photo', 'outline-style')).toBe('none');
    expect(await style(page, 'text-button', 'box-shadow')).toBe(plainShadow);
  });

  test('picking a style restyles the page at once, per site, and is remembered', async ({
    context,
    worker,
    extensionId,
  }) => {
    const { page, tabId } = await openTab(context, worker, PAGE);
    const other = await openTab(context, worker, 'http://127.0.0.1:4173/theme.html');

    const popup = await openPopup(context, extensionId, tabId);
    await siteSwitch(popup, 'localhost').click();
    const otherPopup = await openPopup(context, extensionId, other.tabId);
    await siteSwitch(otherPopup, '127.0.0.1').click();

    await expect.poll(() => style(page, 'photo', 'border-radius')).toBe('16px');
    await expect(popup.getByRole('radio', { name: /Classic Cartoon/ })).toBeChecked();

    await popup.getByRole('radio', { name: /Comic Book/ }).check();
    await expect.poll(() => style(page, 'photo', 'border-radius')).toBe('4px');
    await popup.getByRole('radio', { name: /Storybook/ }).check();
    await expect.poll(() => style(page, 'photo', 'border-radius')).toBe('22px');
    expect(await page.locator('#toonify-web-style').count()).toBe(1);

    // The other site keeps its own style.
    expect(await style(other.page, 'photo', 'border-radius')).toBe('16px');

    // Remembered after reload and in the reopened popup.
    await page.reload();
    await expect.poll(() => style(page, 'photo', 'border-radius')).toBe('22px');
    const reopened = await openPopup(context, extensionId, tabId);
    await expect(reopened.getByRole('radio', { name: /Storybook/ })).toBeChecked();

    // Arrow keys move between styles (native radio group).
    await reopened.getByRole('radio', { name: /Storybook/ }).focus();
    await reopened.keyboard.press('ArrowUp');
    await expect(reopened.getByRole('radio', { name: /Comic Book/ })).toBeChecked();
    await expect.poll(() => style(page, 'photo', 'border-radius')).toBe('4px');
    // Focus survives the save, so a second key press keeps going.
    await expect(reopened.getByRole('radio', { name: /Comic Book/ })).toBeFocused();
    await reopened.keyboard.press('ArrowUp');
    await expect(reopened.getByRole('radio', { name: /Classic Cartoon/ })).toBeChecked();
    await expect.poll(() => style(page, 'photo', 'border-radius')).toBe('16px');
  });
});
