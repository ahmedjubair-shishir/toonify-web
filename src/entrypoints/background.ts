import { browser, defineBackground } from '#imports';
import { enabledSetting } from '@/core/settings';

/**
 * Background service worker.
 *
 * Chrome stops this worker when idle and restarts it on demand, so it must
 * never keep important state in variables: everything lives in storage.
 * In Milestone 0 it only sets up defaults on first install.
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      await enabledSetting.setValue(false);
    }
  });
});
