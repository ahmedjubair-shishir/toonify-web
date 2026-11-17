# Milestone 1: Extension shell and popup

Goal (spec section 14): enable/disable and current-site settings work reliably.

## Decisions

| Area              | Decision                                                                                         | Why                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Access model      | **Per site, user-initiated.** `optional_host_permissions`; nothing granted at install            | Owner decision (17 Nov 2026). No "read and change all your data" warning at install (spec 11) |
| What is a "site"  | Host name without `www.` (`wikipedia.org` = `www.wikipedia.org`; `bn.wikipedia.org` is separate) | Precise and predictable; no public-suffix dependency                                          |
| Content script    | WXT `registration: 'runtime'`, no `matches`; background registers it for allowed sites only      | Runs only where allowed; persists across reloads, new tabs and browser restarts               |
| Already-open tabs | Background injects the script into open tabs of a newly allowed site; script ignores duplicates  | "Allow" works immediately without a reload                                                    |
| Settings          | One object `{ globalEnabled, sites: { [site]: { enabled } } }`, validated on every read          | Untrusted storage never crashes the extension (spec 5.6, 9.5)                                 |
| Messaging         | Typed `MessageMap` (`toonify/get-status`, `toonify/site-allowed`), validated on receipt          | Spec 9.5; popup can verify the layer really applied                                           |
| Reset site        | Forget the site's settings and remove its access (back to "Needs access")                        | Matches "until the user turns it off": a full, reversible restore                             |
| Tokens            | `src/core/tokens/tokens.css` generated from Figma variables (Light/Dark + Mint/Coral)            | Single source of truth with the design                                                        |
| New dependencies  | `lucide-react` (ISC), `@fontsource-variable/inter` (OFL-1.1), dev: `@types/chrome`               | Same icons as Figma; local font (no Google Fonts requests); test typing                       |

## Permissions in the store build

```json
"permissions": ["storage", "activeTab", "scripting"],
"optional_host_permissions": ["*://*/*"]
```

- `storage`: remember settings.
- `activeTab`: when the user clicks the toolbar icon, read the current tab's address so the popup knows which site it is about.
- `scripting`: register and inject the page script, only on allowed sites.
- Optional hosts: requested one site at a time from the popup's "Allow on {site}" button.
  - It must be the single pattern `*://*/*`. The popup asks for `*://site/*` (http and https), and Chrome only grants a request that one manifest pattern fully covers. With `http://*/*` plus `https://*/*`, Chrome refused with "Only permissions specified in the manifest may be requested" (found in manual testing; covered by an e2e test now).

The e2e test build (`wxt build --mode e2e`, output `.output/chrome-mv3-e2e`) additionally pre-grants `localhost` and `127.0.0.1` and adds `tabs`, because automated tests cannot click Chrome's permission prompt or the toolbar icon. These never ship.

## Popup states (Figma: Popup page)

| State           | When                                      | Figma frame                                        |
| --------------- | ----------------------------------------- | -------------------------------------------------- |
| Needs access    | Regular site, not allowed yet             | Onboarding 05                                      |
| Off for site    | Allowed, but the site switch is off       | 02                                                 |
| Active          | Allowed and on                            | 01 (shell only: presets and effects come in M2/M3) |
| Reload to apply | Allowed and on, but the tab has no script | new                                                |
| Can't run here  | Browser pages, web stores, non-web pages  | 04                                                 |
| Paused          | Header switch off                         | 09                                                 |
| Reset dialog    | Footer "Reset site"                       | 07                                                 |
| Toast           | After reset                               | 08                                                 |

All states checked in Light and Dark at 360px.

## Test results (17 Nov 2026, Claude's Linux workspace)

| Check                         | Result                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| `npm run compile`             | Pass, 0 errors                                                         |
| `npm run lint`                | Pass, 0 problems                                                       |
| `npm run format:check`        | Pass                                                                   |
| `npm test`                    | Pass, 56 / 56 in 5 files                                               |
| `npm run build` (store build) | Pass, no host permissions, no static content script                    |
| `npm run test:e2e`            | Pass, 8 / 8                                                            |
| Mutation check                | Breaking per-site isolation makes the isolation test fail, as expected |

E2E coverage: allowed site starts off → turn on → styled, survives reload and new tab, page interactive, no page errors; site A on/off never changes site B; global pause and resume; reset asks first, Cancel changes nothing, Confirm removes styling and forgets the site; site without access shows Allow and is untouched; browser page explains the restriction; SPA route changes keep the layer; keyboard: Tab reaches both switches, Space toggles.

Not automatable (manual steps below): Chrome's real permission prompt, clicking the toolbar icon, browser restart persistence.

## Manual test steps (owner, Windows + Chrome)

Before: `chrome://extensions` → Toonify card → **Remove** (old Milestone 0 permissions), then **Load unpacked** `.output\chrome-mv3` again.

1. On install, Chrome shows no "read and change all your data" warning.
2. Open wikipedia.org, click Toonify: "Allow Toonify on this site?" → **Allow on wikipedia.org** → Chrome asks → Allow. The page is styled without reloading.
3. Open another Wikipedia page in a new tab: styled automatically.
4. Open youtube.com in another tab: untouched; popup there shows "Needs access".
5. Back on Wikipedia, site switch off: every Wikipedia tab returns to normal; switch on: styled again.
6. Header switch off ("Paused"): all sites normal. Resume.
7. Close and reopen Chrome, open Wikipedia: still styled.
8. "Reset site" → dialog → Reset: Wikipedia returns to normal; popup shows "Needs access" again.
9. Open `chrome://settings`: "Can't run on this page".
10. Keyboard: open popup, Tab through switches and buttons, Space/Enter work, focus ring visible.

## Known limitations

- No onboarding tab yet (Figma Onboarding 01 to 04); the popup handles first use. Planned with the settings page.
- "Allow on all sites" is not offered (owner decision: per site). Can be added later as an option.
- Subdomains are separate sites (`bn.wikipedia.org` needs its own Allow).
- Presets, intensity and effects are not built yet (Milestones 2 and 3), so the Active state shows a short note instead.
- The Milestone 0 treatment (rounded images, outlines, button shadows) is still the placeholder style; the Wikipedia icon findings remain open for Milestone 2.
