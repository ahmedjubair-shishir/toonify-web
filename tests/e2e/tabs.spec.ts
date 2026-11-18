import type { Worker } from '@playwright/test';
import { expect, openPopup, openTab, test } from './fixtures';

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

test.describe('Popup section tabs', () => {
  test('Style, Effects and Icons are tabs that show their current choice', async ({
    context,
    worker,
    extensionId,
  }) => {
    await preset(worker, {
      enabled: true,
      theme: 'comic-book',
      effects: { sketch: true, texture: true },
      iconSet: 'phosphor',
      iconLook: 'cartoon',
    });
    const { tabId } = await openTab(context, worker, 'http://localhost:4173/theme.html');
    const popup = await openPopup(context, extensionId, tabId);

    const tabs = popup.getByRole('tablist', { name: 'Customize this site' }).getByRole('tab');
    await expect(tabs).toHaveCount(3);
    const style = popup.getByRole('tab', { name: /Style/ });
    const effects = popup.getByRole('tab', { name: /Effects/ });
    const icons = popup.getByRole('tab', { name: /Icons/ });
    // Each tab tells what is set, without opening it.
    await expect(style).toContainText('Comic Book');
    await expect(effects).toContainText('2 on');
    await expect(icons).toContainText('Phosphor · Cartoon');

    // Style is open first; the other panels are hidden.
    await expect(style).toHaveAttribute('aria-selected', 'true');
    await expect(popup.getByRole('radio', { name: /Comic Book/ })).toBeChecked();
    await expect(popup.getByRole('switch', { name: 'Hand-drawn lines' })).toBeHidden();

    // Click opens a tab.
    await effects.click();
    await expect(popup.getByRole('switch', { name: 'Hand-drawn lines' })).toBeVisible();
    await expect(popup.getByRole('radio', { name: /Comic Book/ })).toBeHidden();

    // Summaries follow changes made inside the panel.
    await popup.getByRole('switch', { name: 'Hand-drawn lines' }).click();
    await expect(effects).toContainText('1 on');

    // Keyboard: arrows move and open, focus follows; only the open tab is in the Tab order.
    await effects.focus();
    await popup.keyboard.press('ArrowRight');
    await expect(icons).toBeFocused();
    await expect(icons).toHaveAttribute('aria-selected', 'true');
    await expect(popup.getByRole('group', { name: 'Set' })).toBeVisible();
    await popup.keyboard.press('ArrowRight');
    await expect(style).toBeFocused();
    await popup.keyboard.press('End');
    await expect(icons).toBeFocused();
    await expect(style).toHaveAttribute('tabindex', '-1');

    // The last tab is remembered next time the popup opens.
    await popup.close();
    const again = await openPopup(context, extensionId, tabId);
    await expect(again.getByRole('tab', { name: /Icons/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
