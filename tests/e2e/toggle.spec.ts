import { expect, hasActiveAttribute, openPopup, styleCount, test } from './fixtures';

test.describe('Milestone 0: add and remove the Toonify layer', () => {
  test('static page: turns on, survives 10 toggles, turns off cleanly, page still works', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/static.html');

    // Off by default: the page is untouched.
    expect(await hasActiveAttribute(page)).toBe(false);
    expect(await styleCount(page)).toBe(0);

    const popup = await openPopup(context, extensionId);
    const toggle = popup.getByRole('switch', { name: /toonify for all sites/i });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Turn on.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => hasActiveAttribute(page)).toBe(true);
    expect(await styleCount(page)).toBe(1);
    await expect(page.locator('#photo')).toHaveCSS('border-radius', '10px');

    // 10 more toggles end in the "on" state with still exactly one <style>.
    for (let i = 0; i < 10; i++) await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => hasActiveAttribute(page)).toBe(true);
    expect(await styleCount(page)).toBe(1);

    // The page keeps working while Toonify is on.
    await page.locator('#counter').click();
    await expect(page.locator('#counter')).toHaveText('Clicked 1 times');
    await page.locator('#name').fill('Ahmed');
    await expect(page.locator('#name')).toHaveValue('Ahmed');

    // Turn off: every trace is gone and the page still works.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect.poll(() => hasActiveAttribute(page)).toBe(false);
    expect(await styleCount(page)).toBe(0);
    await expect(page.locator('#photo')).toHaveCSS('border-radius', '0px');
    await page.locator('#counter').click();
    await expect(page.locator('#counter')).toHaveText('Clicked 2 times');

    expect(errors).toEqual([]);
  });

  test('dynamic page: layer survives route changes that wipe <html> attributes and <head>', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto('/dynamic.html');

    const popup = await openPopup(context, extensionId);
    await popup.getByRole('switch', { name: /toonify for all sites/i }).click();
    await expect.poll(() => hasActiveAttribute(page)).toBe(true);

    for (let i = 0; i < 5; i++) {
      await page.locator('#navigate').click();
      await expect(page.locator('h1')).toHaveText(`Page ${i + 2}`);
    }

    await expect.poll(() => hasActiveAttribute(page)).toBe(true);
    await expect.poll(() => styleCount(page)).toBe(1);
    // Elements created after Toonify turned on are styled too.
    await expect(page.locator('.late-image')).toHaveCSS('border-radius', '10px');

    // Turning off is still complete on a dynamic page.
    await popup.getByRole('switch', { name: /toonify for all sites/i }).click();
    await expect.poll(() => hasActiveAttribute(page)).toBe(false);
    expect(await styleCount(page)).toBe(0);
    await page.locator('#navigate').click();
    await page.waitForTimeout(100);
    expect(await hasActiveAttribute(page)).toBe(false);
  });

  test('restricted page: popup explains it instead of breaking', async ({
    context,
    extensionId,
  }) => {
    // When the popup itself is the active tab, the active URL is chrome-extension://,
    // which browsers never let extensions change. Same code path as chrome://settings.
    const popup = await openPopup(context, extensionId);
    await expect(popup.getByText("Can't run on this page")).toBeVisible();
    // The global switch is still usable.
    await expect(popup.getByRole('switch', { name: /toonify for all sites/i })).toBeEnabled();
  });

  test('popup is keyboard operable', async ({ context, extensionId }) => {
    const popup = await openPopup(context, extensionId);
    const toggle = popup.getByRole('switch', { name: /toonify for all sites/i });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await popup.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await popup.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});
