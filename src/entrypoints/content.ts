import { defineContentScript } from '#imports';
import { createClassifier } from '@/content/classify';
import { buildThemeCss } from '@/content/theme-css';
import {
  applyLayer,
  createLayerGuard,
  isLayerApplied,
  removeLayer,
  type LayerContent,
} from '@/content/toonify-layer';
import { getTheme } from '@/core/themes';
import { onMessages } from '@/core/messaging';
import { getSettings, isSiteActive, watchSettings, type Settings } from '@/core/settings';
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

    const contentFor = (settings: Settings): LayerContent => {
      const theme = getTheme(settings.sites[site]?.theme);
      return { css: buildThemeCss(theme), filter: theme.cartoon };
    };
    const initial = await getSettings();
    let active = isSiteActive(initial, site);
    let content = contentFor(initial);
    const guard = createLayerGuard(
      document,
      () => active,
      () => content,
    );
    const classifier = createClassifier(document);

    const sync = () => {
      if (active) {
        applyLayer(document, content);
        guard.start();
        classifier.start();
      } else {
        classifier.stop();
        guard.stop();
        removeLayer(document);
      }
    };
    sync();

    // Popup switches (global or this site) update every tab on this site.
    // Other sites' settings changing does not affect this page.
    // A new style for this site swaps the CSS in place (no flicker, no reload).
    const unwatch = watchSettings((settings) => {
      const next = isSiteActive(settings, site);
      const nextContent = contentFor(settings);
      if (next === active && nextContent.css === content.css) return;
      active = next;
      content = nextContent;
      sync();
    });

    const stopMessages = onMessages({
      'toonify/get-status': () => ({ site, applied: isLayerApplied(document) }),
    });

    ctx.onInvalidated(() => {
      unwatch();
      stopMessages();
      classifier.stop();
      guard.stop();
      removeLayer(document);
      window.__toonifyContentLoaded = false;
    });
  },
});
