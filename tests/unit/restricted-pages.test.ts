import { describe, expect, it } from 'vitest';
import { getPageSupport } from '@/core/restricted-pages';

describe('getPageSupport', () => {
  it.each([
    ['https://example.com/', 'supported'],
    ['http://localhost:4173/static.html', 'supported'],
    ['chrome://settings', 'browser-page'],
    ['chrome://newtab/', 'browser-page'],
    ['edge://extensions', 'browser-page'],
    ['about:blank', 'browser-page'],
    ['chrome-extension://abcdefgh/popup.html', 'browser-page'],
    ['https://chromewebstore.google.com/detail/x', 'web-store'],
    ['https://chrome.google.com/webstore/detail/x', 'web-store'],
    ['https://addons.mozilla.org/en-US/firefox/', 'web-store'],
    ['https://chrome.google.com/other', 'supported'],
    ['file:///C:/notes.html', 'unknown'],
    ['not a url', 'unknown'],
    [undefined, 'unknown'],
  ] as const)('%s -> %s', (url, expected) => {
    expect(getPageSupport(url)).toBe(expected);
  });
});
