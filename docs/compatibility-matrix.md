# Compatibility matrix

Only what was actually tested is marked as working. Updated: Milestone 0, 17 Nov 2026.

| Platform              | Target       | Status              | Evidence                                                                             |
| --------------------- | ------------ | ------------------- | ------------------------------------------------------------------------------------ |
| Chromium (Playwright) | Development  | Pass (automated)    | Chrome for Testing 153, Linux: 4/4 e2e tests (static, dynamic, restricted, keyboard) |
| Chrome desktop        | Required     | Pending manual test | Owner to load unpacked on Windows (see milestone-0.md)                               |
| Edge desktop          | Required     | Not tested          | Same MV3 build expected to work; must be verified                                    |
| Brave desktop         | Best effort  | Not tested          |                                                                                      |
| Firefox desktop       | Planned (M7) | Not tested          | `npm run build:firefox` exists; not verified                                         |
| Safari macOS          | Planned (M7) | Not tested          | Needs Safari Web Extension packaging                                                 |
| Firefox Android       | Exploratory  | Not tested          |                                                                                      |
| Safari iOS / iPadOS   | Exploratory  | Not tested          |                                                                                      |
| Chrome Android        | Not a target | Not possible        | Chrome on Android does not support desktop extensions                                |

## Page types (Milestone 0)

| Page type                                          | Result                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Static HTML page                                   | Pass: applies, 10 toggles leave 1 style, removes cleanly, page interactive |
| Dynamic SPA (rewrites `<html>` attrs and `<head>`) | Pass: layer guard restores it; new elements styled; clean removal          |
| Browser pages (`chrome://`, extension pages)       | Pass: popup explains "Can't run on this page"                              |
| Web stores                                         | Detected by URL (unit tested); not browser-tested                          |
| `file://` pages                                    | Not supported in M0 (needs "Allow access to file URLs")                    |
| Cross-origin iframes, closed shadow roots          | Not handled in M0 (known limitation)                                       |
