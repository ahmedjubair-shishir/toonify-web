import { defineConfig } from 'wxt';
import { iconPublicFiles } from './src/core/icons';

// WXT config reference: https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: ({ mode }) => ({
    name: 'Toonify Web',
    description:
      'Make the web feel illustrated. A reversible, cartoon-inspired layer for websites.',
    permissions: [
      'storage', // remember settings
      'activeTab', // read the current tab's address when the popup opens
      'scripting', // register/inject the page script on allowed sites only
    ],
    // Nothing is granted at install. Each site is allowed by the user from the popup.
    // One pattern covering http and https. Chrome only grants a request it can
    // match to a single manifest pattern, and the popup asks for *://site/*.
    optional_host_permissions: ['*://*/*'],
    // e2e test builds only (`wxt build --mode e2e`, output in .output/chrome-mv3-e2e):
    // - pre-grant two local test sites, because tests cannot click Chrome's prompt;
    // - add "tabs" so the popup can read page addresses, because tests cannot
    //   click the toolbar icon (which is what grants activeTab in real use).
    ...(mode === 'e2e'
      ? {
          host_permissions: ['*://localhost/*', '*://127.0.0.1/*'],
          permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
        }
      : {}),
    action: {
      default_title: 'Toonify Web',
    },
    // Fonts for "Playful headings" and drawings for the icon swap, loaded by
    // pages Toonify styles. Extension files load even under strict site
    // security policies, which block data: images.
    web_accessible_resources: [
      { resources: ['fonts/*.woff2', 'icons/*/*/*.svg'], matches: ['<all_urls>'] },
    ],
  }),
  hooks: {
    // Icon files are generated from src/core/icon-sets.data.ts at build time
    // (one per set, look and meaning), so they are never edited by hand.
    'build:publicAssets': (_wxt, files) => {
      files.push(...iconPublicFiles());
    },
  },
});
