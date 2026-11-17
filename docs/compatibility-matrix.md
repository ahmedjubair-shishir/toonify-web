# Compatibility matrix

Only what was actually tested is marked as working. Updated: Milestone 1, 17 Nov 2026.

| Platform              | Target       | Status            | Evidence                                                                                                                  |
| --------------------- | ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Chromium (Playwright) | Development  | Pass (automated)  | Chrome for Testing 153, Linux: M1 8/8 e2e tests (per site, isolation, pause, reset, no access, restricted, SPA, keyboard) |
| Chrome desktop        | Required     | Pass (manual, M0) | Windows, loaded unpacked, 17 Nov 2026: on/off on Wikipedia, restricted message, no extension errors                       |
| Edge desktop          | Required     | Not tested        | Same MV3 build expected to work; must be verified                                                                         |
| Brave desktop         | Best effort  | Not tested        |                                                                                                                           |
| Firefox desktop       | Planned (M7) | Not tested        | `npm run build:firefox` exists; not verified                                                                              |
| Safari macOS          | Planned (M7) | Not tested        | Needs Safari Web Extension packaging                                                                                      |
| Firefox Android       | Exploratory  | Not tested        |                                                                                                                           |
| Safari iOS / iPadOS   | Exploratory  | Not tested        |                                                                                                                           |
| Chrome Android        | Not a target | Not possible      | Chrome on Android does not support desktop extensions                                                                     |

## Page types (Milestone 0)

| Page type                                          | Result                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Static HTML page                                   | Pass: applies, 10 toggles leave 1 style, removes cleanly, page interactive |
| Dynamic SPA (rewrites `<html>` attrs and `<head>`) | Pass: layer guard restores it; new elements styled; clean removal          |
| Browser pages (`chrome://`, extension pages)       | Pass: popup explains "Can't run on this page"                              |
| Web stores                                         | Pass: unit tested + manual (chromewebstore.google.com shows the message)   |
| Real site: Wikipedia (English page, Bengali text)  | Pass for on/off and usability; visual findings below                       |
| `file://` pages                                    | Not supported in M0 (needs "Allow access to file URLs")                    |
| Cross-origin iframes, closed shadow roots          | Not handled in M0 (known limitation)                                       |

## Visual findings (input for Milestone 2)

Found on en.wikipedia.org with the Milestone 0 treatment:

1. Icon-only buttons (Wikipedia's collapse toggles in the Contents sidebar) get the button shadow and look like stray ")" marks.
2. Small icon images (16 to 24px, for example the coordinates globe) get a 3px ink outline and turn into dark blobs.

Cause: one blanket rule for every `img` and `button`; CSS alone cannot tell icons from content images. Milestone 2 must classify elements (rendered size, role, icon-only buttons, decorative images) before styling them.
