import {
  expect,
  globalSwitch,
  isStyled,
  openPopup,
  openTab,
  siteSwitch,
  styleCount,
  test,
} from './fixtures';

const SITE_A = 'http://localhost:4173';
const SITE_B = 'http://127.0.0.1:4173';

test.describe('Milestone 1: per-site Toonify', () => {
  test('allowed site starts off; turning it on styles the page, reloads and new tabs', async ({
    context,
    worker,
    extensionId,
  }) => {
    const { page, tabId } = await openTab(context, worker, `${SITE_A}/static.html`);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    expect(await isStyled(page)).toBe(false);

    const popup = await openPopup(context, extensionId, tabId);
    await expect(popup.getByText('Off. This site keeps its original look.')).toBeVisible();
    await siteSwitch(popup, 'localhost').click();

    await expect.poll(() => isStyled(page)).toBe(true);
    expect(await styleCount(page)).toBe(1);
    await expect(popup.getByText('On in every localhost tab', { exact: false })).toBeVisible();
    await expect(siteSwitch(popup, 'localhost')).toHaveAttribute('aria-checked', 'true');

    // Stays on after reload, and in a new tab on the same site.
    await page.reload();
    await expect.poll(() => isStyled(page)).toBe(true);
    const { page: second } = await openTab(context, worker, `${SITE_A}/dynamic.html`);
    await expect.poll(() => isStyled(second)).toBe(true);

    // The page still works.
    await page.locator('#counter').click();
    await expect(page.locator('#counter')).toHaveText('Clicked 1 times');
    expect(errors).toEqual([]);
  });

  test('turning one site on or off never affects another site', async ({
    context,
    worker,
    extensionId,
  }) => {
    const a = await openTab(context, worker, `${SITE_A}/static.html`);
    const b = await openTab(context, worker, `${SITE_B}/static.html`);

    const popupA = await openPopup(context, extensionId, a.tabId);
    await siteSwitch(popupA, 'localhost').click();
    await expect.poll(() => isStyled(a.page)).toBe(true);
    // Site B has the script but was never turned on.
    expect(await isStyled(b.page)).toBe(false);

    const popupB = await openPopup(context, extensionId, b.tabId);
    await siteSwitch(popupB, '127.0.0.1').click();
    await expect.poll(() => isStyled(b.page)).toBe(true);

    // Site switch off on A: only A changes, in every A tab.
    await siteSwitch(popupA, 'localhost').click();
    await expect.poll(() => isStyled(a.page)).toBe(false);
    expect(await styleCount(a.page)).toBe(0);
    expect(await isStyled(b.page)).toBe(true);
    await expect(popupA.getByText('Off. This site keeps its original look.')).toBeVisible();
  });

  test('global pause turns every site off and Resume brings them back', async ({
    context,
    worker,
    extensionId,
  }) => {
    const a = await openTab(context, worker, `${SITE_A}/static.html`);
    const popup = await openPopup(context, extensionId, a.tabId);
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => isStyled(a.page)).toBe(true);

    await globalSwitch(popup).click();
    await expect.poll(() => isStyled(a.page)).toBe(false);
    await expect(popup.getByText('Toonify is paused')).toBeVisible();

    await popup.getByRole('button', { name: 'Resume Toonify' }).click();
    await expect.poll(() => isStyled(a.page)).toBe(true);
  });

  test('reset site asks first, then removes styling and forgets the site', async ({
    context,
    worker,
    extensionId,
  }) => {
    const a = await openTab(context, worker, `${SITE_A}/static.html`);
    const popup = await openPopup(context, extensionId, a.tabId);
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => isStyled(a.page)).toBe(true);

    await popup.getByRole('button', { name: 'Reset site' }).click();
    const dialog = popup.getByRole('dialog', { name: 'Reset this site?' });
    await expect(dialog).toBeVisible();

    // Cancel changes nothing.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(await isStyled(a.page)).toBe(true);

    await popup.getByRole('button', { name: 'Reset site' }).click();
    await dialog.getByRole('button', { name: 'Reset site' }).click();
    await expect.poll(() => isStyled(a.page)).toBe(false);
    await expect(popup.getByRole('status')).toContainText(
      'localhost restored to its original look',
    );
    const sites = await worker.evaluate(async () => {
      const stored = (await chrome.storage.local.get('settings')) as {
        settings?: { sites?: unknown };
      };
      return stored.settings?.sites;
    });
    expect(sites).toEqual({});
  });

  test('site without access shows the Allow screen and is never touched', async ({
    context,
    worker,
    extensionId,
  }) => {
    const { page, tabId } = await openTab(context, worker, 'http://127.0.0.2:4173/static.html');
    const popup = await openPopup(context, extensionId, tabId);
    await expect(popup.getByText('Allow Toonify on this site?')).toBeVisible();
    const allow = popup.getByRole('button', { name: 'Allow on 127.0.0.2' });
    await expect(allow).toBeVisible();
    expect(await isStyled(page)).toBe(false);

    // Regression: Chrome rejected the request when the manifest pattern did not
    // cover it, and the button failed silently. Now Chrome opens its prompt,
    // which stays pending in automation, so no error message appears.
    await allow.click();
    await popup.waitForTimeout(1000);
    // Immediate check: a retrying assertion would wait out the toast's 5s auto-dismiss.
    expect(await popup.getByText("Chrome didn't allow access").count()).toBe(0);
    expect(await isStyled(page)).toBe(false);
  });

  test('browser pages explain the restriction', async ({ context, worker, extensionId }) => {
    const { tabId } = await openTab(context, worker, 'about:blank');
    const popup = await openPopup(context, extensionId, tabId);
    await expect(popup.getByText("Can't run on this page")).toBeVisible();
    await expect(globalSwitch(popup)).toBeEnabled();
  });

  test('dynamic single-page app keeps the layer through route changes', async ({
    context,
    worker,
    extensionId,
  }) => {
    const { page, tabId } = await openTab(context, worker, `${SITE_A}/dynamic.html`);
    const popup = await openPopup(context, extensionId, tabId);
    await siteSwitch(popup, 'localhost').click();
    await expect.poll(() => isStyled(page)).toBe(true);

    for (let i = 0; i < 5; i++) {
      await page.locator('#navigate').click();
      await expect(page.locator('h1')).toHaveText(`Page ${i + 2}`);
    }
    await expect.poll(() => isStyled(page)).toBe(true);
    await expect.poll(() => styleCount(page)).toBe(1);
    await expect(page.locator('.late-image')).toHaveCSS('border-radius', '10px');
  });

  test('popup is keyboard operable', async ({ context, worker, extensionId }) => {
    const { tabId } = await openTab(context, worker, `${SITE_A}/static.html`);
    const popup = await openPopup(context, extensionId, tabId);
    await expect(popup.getByText('Off. This site keeps its original look.')).toBeVisible();

    await popup.keyboard.press('Tab');
    await expect(globalSwitch(popup)).toBeFocused();
    await popup.keyboard.press('Tab');
    await expect(siteSwitch(popup, 'localhost')).toBeFocused();
    await popup.keyboard.press('Space');
    await expect(siteSwitch(popup, 'localhost')).toHaveAttribute('aria-checked', 'true');
  });
});
