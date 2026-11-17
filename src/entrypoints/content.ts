import { browser, defineContentScript } from '#imports';
import type { PublicPath } from 'wxt/browser';
import { buildEffectsCss } from '@/content/effects-css';
import { applyScheme } from '@/content/page-scheme';
import { resolveEffects } from '@/core/effects';
import { createCartoonizeUi, type CartoonizeUi } from '@/content/cartoonize-ui';
import { clearIconMarks, createClassifier } from '@/content/classify';
import { buildIconsCss, needsIconSketch } from '@/content/icons-css';
import { iconsActive, resolveIcons } from '@/core/icons';
import { getAiTool, stylePrompt } from '@/core/ai-tools';
import { buildThemeCss } from '@/content/theme-css';
import {
  applyLayer,
  createLayerGuard,
  isLayerApplied,
  removeLayer,
  type LayerContent,
} from '@/content/toonify-layer';
import { getTheme } from '@/core/themes';
import { onMessages, sendToBackground } from '@/core/messaging';
import {
  getSettings,
  isSiteActive,
  setAiConsent,
  watchSettings,
  type Settings,
} from '@/core/settings';
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

    // Bundled fonts for "Playful headings" (web-accessible, see wxt.config.ts).
    const fonts = {
      latin: browser.runtime.getURL('/fonts/fredoka-latin.woff2'),
      latinExt: browser.runtime.getURL('/fonts/fredoka-latin-ext.woff2'),
    };
    const contentFor = (settings: Settings): LayerContent => {
      const theme = getTheme(settings.sites[site]?.theme);
      const effects = resolveEffects(settings.sites[site]?.effects);
      const icons = iconsFor(settings);
      return {
        css:
          buildThemeCss(theme) +
          buildEffectsCss(theme, effects, fonts) +
          buildIconsCss(icons, iconUrl),
        filters: {
          cartoon: theme.cartoon,
          sketch: effects.sketch,
          iconSketch: needsIconSketch(icons),
        },
      };
    };
    // Icon files are generated at build time, so WXT's path list doesn't know them.
    const iconUrl = (path: string) => browser.runtime.getURL(path as PublicPath);
    const iconsFor = (settings: Settings) =>
      resolveIcons(settings.sites[site]?.iconSet, settings.sites[site]?.iconLook);
    const initial = await getSettings();
    let active = isSiteActive(initial, site);
    let content = contentFor(initial);
    // AI tool and style instruction, kept current for the Cartoonize chip.
    let aiTool = getAiTool(initial.aiTool);
    let themeId = getTheme(initial.sites[site]?.theme).id;
    // Icons are only looked for while the icon feature changes something.
    let findIcons = iconsActive(iconsFor(initial));
    const guard = createLayerGuard(
      document,
      () => active,
      () => content,
    );
    const classifier = createClassifier(document, undefined, { icons: () => findIcons });
    // AI Cartoonize chip: only when the site is on and an AI tool is picked.
    let cartoonizeUi: CartoonizeUi | null = null;
    const startCartoonize = () => {
      if (cartoonizeUi !== null || aiTool.kind === 'off') return;
      cartoonizeUi = createCartoonizeUi(document, {
        currentTool: () => aiTool,
        stylePrompt: () => stylePrompt(themeId),
        hasConsent: async () => (await getSettings()).aiConsent,
        giveConsent: async () => {
          await setAiConsent(true);
        },
        requestCartoon: (image) => sendToBackground({ type: 'toonify/cartoonize', ...image }),
        openAiApp: async (tool) =>
          (await sendToBackground({ type: 'toonify/open-ai-app', tool })).ok,
        fetchImage: (url) => sendToBackground({ type: 'toonify/fetch-image', url }),
      });
    };
    const stopCartoonize = () => {
      cartoonizeUi?.destroy(); // also restores every original image
      cartoonizeUi = null;
    };

    const sync = () => {
      if (active) {
        applyLayer(document, content);
        applyScheme(document);
        guard.start();
        classifier.start();
        if (aiTool.kind === 'off') stopCartoonize();
        else startCartoonize();
      } else {
        stopCartoonize();
        classifier.stop();
        guard.stop();
        removeLayer(document);
      }
    };
    sync();
    // The page's own colours are known only once it has loaded: re-check then.
    const recheckScheme = () => {
      if (active) applyScheme(document);
    };
    document.addEventListener('DOMContentLoaded', recheckScheme, { once: true });
    window.addEventListener('load', recheckScheme, { once: true });

    // Popup switches (global or this site) update every tab on this site.
    // Other sites' settings changing does not affect this page.
    // A new style for this site swaps the CSS in place (no flicker, no reload).
    const unwatch = watchSettings((settings) => {
      const next = isSiteActive(settings, site);
      const nextContent = contentFor(settings);
      const nextTool = getAiTool(settings.aiTool);
      themeId = getTheme(settings.sites[site]?.theme).id;
      const nextFindIcons = iconsActive(iconsFor(settings));
      if (next === active && nextContent.css === content.css && nextTool.id === aiTool.id) return;
      active = next;
      content = nextContent;
      aiTool = nextTool;
      if (nextFindIcons !== findIcons) {
        // Restart so the classifier starts (or stops) looking for icons.
        findIcons = nextFindIcons;
        classifier.stop();
        if (!findIcons) clearIconMarks(document);
      }
      sync();
    });

    const stopMessages = onMessages({
      'toonify/get-status': () => ({ site, applied: isLayerApplied(document) }),
    });

    ctx.onInvalidated(() => {
      unwatch();
      stopMessages();
      stopCartoonize();
      classifier.stop();
      guard.stop();
      removeLayer(document);
      window.__toonifyContentLoaded = false;
    });
  },
});
