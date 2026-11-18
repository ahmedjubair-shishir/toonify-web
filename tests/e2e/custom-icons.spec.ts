import type { Page, Worker } from '@playwright/test';
import { expect, openPopup, openTab, test } from './fixtures';
import { decodePng } from './png';

const MARK = 'data-toonify-icon';
const RING =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#000" stroke-width="2"/></svg>';

const style = (page: Page, selector: string, property: string) =>
  page
    .locator(selector)
    .evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);

async function colours(page: Page, selector: string) {
  await page.bringToFront();
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

async function preset(
  worker: Worker,
  site: Record<string, unknown>,
  customIconSets: unknown[] = [],
) {
  await worker.evaluate(
    async ([entry, sets]) => {
      await chrome.storage.local.set({
        settings: {
          globalEnabled: true,
          sites: { localhost: entry },
          aiConsent: false,
          aiTool: 'off',
        },
        customIconSets: sets,
      });
    },
    [site, customIconSets] as const,
  );
}

test.describe('Custom icon sets', () => {
  test('add new (popular sets), pick a saved set, edit to remove it', async ({
    context,
    worker,
    extensionId,
  }) => {
    // A set saved earlier (as if downloaded): only "home" is in it.
    await preset(worker, { enabled: true }, [
      { id: 'ring', name: 'Ring', source: 'iconify:ring', icons: { home: RING }, addedAt: 1 },
    ]);
    const { page, tabId } = await openTab(context, worker, 'http://localhost:4173/icons.html');
    const popup = await openPopup(context, extensionId, tabId);
    await popup.getByRole('tab', { name: /Icons/ }).click();
    const sets = popup.getByRole('group', { name: 'Set' });

    // "Add new" is a small action beside the Set heading, not a tile.
    await expect(popup.getByRole('button', { name: 'Add custom' })).toHaveCount(0);
    await popup.getByRole('button', { name: 'Add new' }).click();
    const popular = popup.getByRole('group', { name: 'Popular icon sets' });
    await expect(popular.getByRole('button')).toHaveCount(11);
    // Pasting links is hidden for now.
    await expect(popup.getByRole('textbox')).toHaveCount(0);
    // No internet here: the reason is shown, nothing is saved.
    await popular.getByRole('button', { name: 'Material Design' }).click();
    await expect(popup.getByRole('alert')).toContainText("Couldn't reach Iconify");
    await popup.getByRole('button', { name: 'Close' }).click();
    await expect(popular).toHaveCount(0);

    // Pick the saved set: home is redrawn (red ring), icons it lacks keep theirs.
    await sets.getByText('Ring', { exact: true }).click();
    await expect(sets.getByRole('radio', { name: 'Ring' })).toBeChecked();
    await expect(popup.getByRole('tab', { name: /Icons/ })).toContainText('Custom');
    await expect.poll(() => page.locator('#big').getAttribute(MARK)).toBe('home');
    await expect.poll(() => style(page, '#big', 'mask-image')).toContain('data:image/svg+xml');
    await expect.poll(async () => (await colours(page, '#big')).red).toBeGreaterThan(20);
    const drawn = await colours(page, '#big');
    expect(drawn.blue).toBe(0);
    expect(drawn.red).toBeLessThan(drawn.total * 0.6);
    expect(await style(page, '#labelled', 'mask-image')).toBe('none');

    // Edit: built-in sets can't be removed; the added one can.
    await popup.getByRole('button', { name: 'Edit' }).click();
    await expect(popup.getByRole('button', { name: 'Remove Lucide' })).toHaveCount(0);
    await popup.getByRole('button', { name: 'Remove Ring' }).click();
    await expect(sets.getByRole('radio', { name: 'Ring' })).toHaveCount(0);
    // Confirmation shows as a toast that hides by itself.
    await expect(popup.getByRole('status').filter({ hasText: 'Removed Ring' })).toBeVisible();
    await expect(popup.getByText('Removed Ring')).toBeHidden({ timeout: 8000 });
    await expect(sets.getByRole('radio', { name: 'Original' })).toBeChecked();
    // Nothing left to edit: back to normal, "Add new" returns.
    await expect(popup.getByRole('button', { name: 'Add new' })).toBeVisible();
    await expect
      .poll(async () => (await colours(page, '#big')).blue)
      .toBeGreaterThan(drawn.total * 0.8);
    await expect
      .poll(() =>
        worker.evaluate(async () => {
          const { settings } = (await chrome.storage.local.get('settings')) as {
            settings: { sites: Record<string, { iconSet?: string }> };
          };
          return settings.sites.localhost?.iconSet ?? 'none';
        }),
      )
      .toBe('none');
  });

  test('strict site security policy: never blank icons', async ({ context, worker }) => {
    await preset(worker, { enabled: true, iconSet: 'custom:ring' }, [
      { id: 'ring', name: 'Ring', source: 'iconify:ring', icons: { home: RING }, addedAt: 1 },
    ]);
    const { page } = await openTab(context, worker, 'http://localhost:4173/csp-icons.html');
    await expect.poll(() => page.locator('#big').getAttribute(MARK)).toBe('home');
    await page.waitForTimeout(800);
    // Either the custom icon drew (a ring, not a box) or the site's own icon is back.
    const result = await colours(page, '#big');
    const drewRing = result.red > 20 && result.red < result.total * 0.6 && result.blue === 0;
    const keptOwn = result.blue > result.total * 0.8;
    test.info().annotations.push({
      type: 'csp outcome',
      description: drewRing ? 'custom icon drawn' : keptOwn ? 'site icon kept' : 'blank',
    });
    expect(drewRing || keptOwn).toBe(true);
  });
});
