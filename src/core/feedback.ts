/**
 * Where "Feedback" in the popup leads (owner request, 19 Nov 2026).
 *
 * Installed from the Chrome Web Store: the extension's store page, where
 * people rate, review and use the Support tab. Those land in the developer
 * dashboard (Ratings and User support tabs). The store adds `update_url` to
 * the manifest of store installs, and the extension id is the store item id.
 *
 * Anywhere else (unpacked during development): the project's GitHub issues.
 */
export const GITHUB_ISSUES_URL = 'https://github.com/ahmedjubair-shishir/toonify-web/issues/new';

const STORE_UPDATE_HOST = 'clients2.google.com';

export function feedbackUrl(
  manifest: { update_url?: string | undefined },
  extensionId: string,
): string {
  const fromStore = manifest.update_url?.includes(STORE_UPDATE_HOST) === true;
  return fromStore && /^[a-p]{32}$/.test(extensionId)
    ? `https://chromewebstore.google.com/detail/${extensionId}`
    : GITHUB_ISSUES_URL;
}
