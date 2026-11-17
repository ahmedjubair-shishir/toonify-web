import { defineContentScript } from '#imports';
import { applyLayer, createLayerGuard, removeLayer } from '@/content/toonify-layer';
import { enabledSetting } from '@/core/settings';

export default defineContentScript({
  // Milestone 0: runs on all http(s) pages so we can test the add/remove cycle.
  // Milestone 1 replaces this with optional host permissions + click-to-run
  // (see docs/milestone-0.md, "Permissions").
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',

  async main(ctx) {
    let enabled = await enabledSetting.getValue();
    const guard = createLayerGuard(document, () => enabled);

    const sync = () => {
      if (enabled) {
        applyLayer(document);
        guard.start();
      } else {
        guard.stop();
        removeLayer(document);
      }
    };

    sync();

    // React to the popup switch in every open tab, without any messaging code.
    const unwatch = enabledSetting.watch((value) => {
      enabled = value;
      sync();
    });

    // When the extension is updated, reloaded or removed, this script is
    // "invalidated". Clean up so the page is left exactly as we found it.
    ctx.onInvalidated(() => {
      unwatch();
      guard.stop();
      removeLayer(document);
    });
  },
});
