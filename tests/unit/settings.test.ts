import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { enabledSetting } from '@/core/settings';

describe('enabledSetting', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('is off by default (Toonify never changes a page until asked)', async () => {
    expect(await enabledSetting.getValue()).toBe(false);
  });

  it('persists the value and notifies watchers', async () => {
    const seen: boolean[] = [];
    const unwatch = enabledSetting.watch((value) => seen.push(value));

    await enabledSetting.setValue(true);

    expect(await enabledSetting.getValue()).toBe(true);
    expect(seen).toEqual([true]);
    unwatch();
  });
});
