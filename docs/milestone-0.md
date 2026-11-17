# Milestone 0: Discovery and technical spike

Goal (spec section 14): the extension loads, activates, deactivates, and leaves the page usable.

## Decisions

| Area          | Decision                                           | Why                                                                               |
| ------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Build tooling | WXT 0.21.5 (Vite 8)                                | Maintained, Vite-based, MV3, one codebase for Chrome / Firefox / Safari / Edge    |
| UI            | React 19 via `@wxt-dev/module-react`               | Spec requirement; HMR in dev                                                      |
| Language      | TypeScript 5.9, strict + extra checks              | TS 7.0 is out, but typescript-eslint supports `<6.1`; WXT's own template pins 5.9 |
| Tests         | Vitest 5 + happy-dom; Playwright 1.65              | Unit tests without a browser; e2e with the real built extension                   |
| State         | `chrome.storage.local` via WXT `storage`           | Shared by popup, content scripts and background; survives service-worker restarts |
| Popup ↔ page  | Storage watch, no messaging                        | Simplest reliable path for a global toggle; typed messaging comes in Milestone 1  |
| Permissions   | `storage`, `activeTab` + content script on http(s) | Enough for the spike (see below)                                                  |

### Permissions (important for Milestone 1)

The spike registers its content script on all `http://` and `https://` pages. Chrome will show "Read and change all your data on all websites" at install. The design (onboarding step 3) instead offers:

- **On all websites**: request optional host permissions after our explanation screen.
- **Only when I click Toonify**: `activeTab` + `scripting.executeScript`, no install warning.

Milestone 1 switches to `optional_host_permissions` + `scripting.registerContentScripts` to match the design and the spec's privacy rule ("prefer optional host permissions").

## What was built

- `src/content/toonify-layer.ts`: `applyLayer` / `removeLayer` (idempotent, one attribute + one `<style>`), `createLayerGuard` (MutationObserver on `<html>` attributes and `<html>`/`<head>` children only, re-applies if a site removes the layer, single observer, microtask-batched, cannot loop).
- `src/entrypoints/content.ts`: syncs with the stored setting, watches changes, cleans up on `ctx.onInvalidated`.
- `src/entrypoints/popup/`: header with accessible switch (`role="switch"`), status text, "Can't run on this page" alert, light/dark from the Figma tokens, reduced motion respected.
- `src/core/restricted-pages.ts`: classifies URLs (browser pages, web stores).

## Test results (run 17 Nov 2026, in Claude's Linux workspace)

| Check                           | Result                                                                     |
| ------------------------------- | -------------------------------------------------------------------------- |
| `npm run compile` (tsc strict)  | Pass, 0 errors                                                             |
| `npm run lint` (ESLint 10)      | Pass, 0 problems                                                           |
| `npm run format:check`          | Pass                                                                       |
| `npm test` (Vitest)             | Pass, 24 / 24 tests in 3 files                                             |
| `npm run build`                 | Pass, MV3 manifest, 272 KB total                                           |
| `npm run test:e2e` (Playwright) | Pass, 4 / 4 (Chrome for Testing 153 via `CHROME_PATH`)                     |
| Regression check                | With the layer guard disabled, the dynamic-page e2e test fails as expected |

E2E coverage: static page on/off/10 toggles with exactly one `<style>`, page button and input keep working, no page errors; SPA that wipes `<html>` attributes and `<head>` keeps the layer and styles new elements, and turns off cleanly; popup on a restricted page shows the explanation; switch is keyboard operable (Tab + Space).

## Manual test steps (owner, Windows + Chrome)

1. `npm install`, then `npm run build`.
2. `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`.
3. Open a news site and a web app (for example Wikipedia and GitHub). Click Toonify → switch On. Images get rounded corners with an ink outline; buttons get a small shadow.
4. Use the sites normally: links, search box, menus, scrolling.
5. Switch Off. Everything returns to normal without reloading.
6. Open `chrome://settings`, click Toonify: the popup says it can't run there.
7. DevTools Console on the test pages: no errors from Toonify.
8. Record results in `docs/compatibility-matrix.md`.

## Manual results (owner, 17 Nov 2026, Windows, Node 24.22.1, Chrome)

| Step                                         | Result                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `npm install` + `npm run build`              | Pass (needed PowerShell execution policy `RemoteSigned` for CurrentUser) |
| Load unpacked, no errors on extension card   | Pass (service worker shows "Inactive" when idle: expected)               |
| Wikipedia: switch On applies the treatment   | Pass                                                                     |
| Wikipedia: switch Off removes it, no reload  | Pass                                                                     |
| Chrome Web Store: popup explains restriction | Pass                                                                     |
| Bengali text unaffected                      | Pass (fonts are not changed in M0)                                       |

Visual findings from this test (icon-only buttons and small icons) are recorded in `compatibility-matrix.md` as input for Milestone 2.

**Milestone 0 status: complete.** All acceptance criteria verified (automated + manual).

## Known limitations

- Content script runs on all http(s) pages (changes in Milestone 1, see Permissions).
- Placeholder icons from the WXT template; brand icons come from the Figma export (Milestone 1 / 8).
- Cross-origin iframes and closed shadow roots are not styled (by design: browser security).
- `file://` pages need the user to allow file access; not supported yet.
- The treatment is intentionally minimal; the real theme engine is Milestone 2.

## Next: Milestone 1 (Extension shell and popup)

Typed settings model with runtime validation and migration, per-site on/off, typed messaging, design tokens file, popup built from the Figma components, permission flow (optional host permissions), basic error states.
