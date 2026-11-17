import { defineContentScript } from '#imports';
import { applyLayer, createLayerGuard, isLayerApplied, removeLayer } from '@/content/toonify-layer';
import { onMessages } from '@/core/messaging';
import { getSettings, isSiteActive, watchSettings } from '@/core/settings';
import { siteKeyFromUrl } from '@/core/site';

declare global {
  interface Window {
    __toonifyContentLoaded?: boolean;
  }
}

export default defineContentScript({
  // Not in the manifest: the background registers this script only for sites
  // the user has allowed (no `matches` here, so no install-time permissions).
  registration: 'runtime',
  runAt: 'document_start',

  async main(ctx) {
    // The background may inject this script into a tab that already has it.
    // This flag lives in the extension's isolated world, not the page's.
    if (window.__toonifyContentLoaded) return;
    window.__toonifyContentLoaded = true;

    const site = siteKeyFromUrl(location.href);
    if (site === null) return;

    let active = isSiteActive(await getSettings(), site);
    const guard = createLayerGuard(document, () => active);

    const sync = () => {
      if (active) {
        applyLayer(document);
        guard.start();
      } else {
        guard.stop();
        removeLayer(document);
      }
    };
    sync();

    // Popup switches (global or this site) update every tab on this site.
    // Other sites' settings changing does not affect this page.
    const unwatch = watchSettings((settings) => {
      const next = isSiteActive(settings, site);
      if (next === active) return;
      active = next;
      sync();
    });

    const stopMessages = onMessages({
      'toonify/get-status': () => ({ site, applied: isLayerApplied(document) }),
    });

    ctx.onInvalidated(() => {
      unwatch();
      stopMessages();
      guard.stop();
      removeLayer(document);
      window.__toonifyContentLoaded = false;
    });
  },
});
