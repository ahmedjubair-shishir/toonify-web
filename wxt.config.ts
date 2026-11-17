import { defineConfig } from 'wxt';

// WXT config reference: https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Toonify Web',
    description:
      'Make the web feel illustrated. A reversible, cartoon-inspired layer for websites.',
    // storage: save the on/off setting.
    // activeTab: lets the popup read the current tab's address (to detect restricted pages)
    //            without the broad "tabs" permission.
    permissions: ['storage', 'activeTab'],
    action: {
      default_title: 'Toonify Web',
    },
  },
});
