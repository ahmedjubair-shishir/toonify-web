import { storage } from '#imports';

/**
 * Global on/off switch for Toonify.
 *
 * Stored in `chrome.storage.local` so every part of the extension (popup,
 * content scripts, background) reads the same value, and it survives the
 * background service worker being stopped by the browser.
 *
 * Off by default: Toonify never changes a page until the user turns it on.
 */
export const enabledSetting = storage.defineItem<boolean>('local:enabled', {
  fallback: false,
});
