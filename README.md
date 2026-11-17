# Toonify Web

Make the web feel illustrated. A browser extension that adds a reversible, cartoon-inspired visual layer to websites while keeping them fully usable.

> Status: **Milestone 1 (extension shell and popup)**. Per-site access chosen by the user, global and per-site switches, popup built from the Figma design. Visual presets arrive in Milestone 2. See [`docs/milestone-1.md`](docs/milestone-1.md).

- Product spec: [`TOONIFY_WEB_PROJECT_GUIDE.md`](TOONIFY_WEB_PROJECT_GUIDE.md)
- Design (Figma): https://www.figma.com/design/21MI0e4PD5heuxkkD87cPO/Toonify-Ext
- Tested platforms: [`docs/compatibility-matrix.md`](docs/compatibility-matrix.md)

## Requirements

- Node.js **22 or newer** (WXT requirement) and npm
- Git
- Chrome, Edge or Brave for manual testing

Check with:

```sh
node -v
npm -v
git --version
```

## Setup

```sh
npm install
```

`npm install` also runs `wxt prepare`, which generates TypeScript types into `.wxt/`.

## Develop

```sh
npm run dev
```

WXT builds the extension, opens a browser with it installed, and reloads on save.

### Load it in your own Chrome (manual testing)

```sh
npm run build
```

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `.output/chrome-mv3` folder
4. Pin Toonify from the puzzle-piece menu, open any website, click the icon and choose **Allow on {site}**

After rebuilding, press the reload icon on the Toonify card in `chrome://extensions`.

## Scripts

| Command               | What it does                                  |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Dev mode with auto-reload (Chrome)            |
| `npm run dev:firefox` | Dev mode in Firefox                           |
| `npm run build`       | Production build in `.output/chrome-mv3`      |
| `npm run zip`         | Store-ready zip                               |
| `npm run compile`     | TypeScript type check (strict)                |
| `npm run lint`        | ESLint                                        |
| `npm run format`      | Prettier (write)                              |
| `npm test`            | Unit tests (Vitest)                           |
| `npm run test:e2e`    | Build, then browser tests with Playwright     |
| `npm run check`       | Type check + lint + format check + unit tests |

### How access works

Toonify asks for nothing at install. On each website, the popup offers **Allow on {site}**; Chrome confirms, and from then on Toonify runs on that site (all tabs, reloads, restarts) until you switch it off or press **Reset site**. Other sites are never affected. Details: [`docs/milestone-1.md`](docs/milestone-1.md).

### First-time Playwright setup

```sh
npx playwright install chromium
```

Branded Google Chrome no longer accepts `--load-extension`, so browser tests use Playwright's Chromium. To use a specific Chromium build instead, set `CHROME_PATH`.

## Project structure

```
src/
  entrypoints/        # WXT entry points (become manifest entries)
    background.ts     # service worker: per-site script registration, permission events
    content.ts        # runs on allowed sites: applies/removes the layer
    popup/            # React popup (360px): App, usePopupState, components/
  background/
    content-registration.ts
  content/
    toonify-layer.ts  # add/remove logic + layer guard for dynamic pages
  core/
    settings.ts       # validated settings model (global + per site)
    site.ts           # what counts as a "site", match patterns
    permissions.ts    # optional host permissions per site
    messaging.ts      # typed message contracts
    restricted-pages.ts
    tokens/tokens.css # generated from the Figma variables
tests/
  unit/               # Vitest (happy-dom + WXT fake browser)
  e2e/                # Playwright with the real extension loaded
  fixtures/           # static + dynamic test pages, tiny server
docs/
```

## Principles

Function first, reversible always, local-first, accessible (WCAG 2.2 AA for our UI), honest about limits. See the spec and [`CLAUDE.md`](CLAUDE.md).
