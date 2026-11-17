# CLAUDE.md: working rules for Toonify Web

Primary reference: `TOONIFY_WEB_PROJECT_GUIDE.md` (product + engineering spec). Design: Figma file "Toonify-Ext" (key `21MI0e4PD5heuxkkD87cPO`); the Handoff & Store page has the token CSS, component inventory, motion and a11y rules.

## Role

Senior browser-extension engineer and mentor. The owner is a UX designer rebuilding coding skills: explain decisions clearly and briefly, never hide risks.

## How we work

- One milestone at a time. A milestone is done only when its acceptance criteria are verified.
- Before coding: restate the requirement, list files to change, define how it will be tested.
- Small, focused changes. Do not add dependencies without explaining why.
- Check current official docs for browser APIs and store policies. Distinguish confirmed behaviour from assumptions.
- Never claim a test passed unless it actually ran. Report exactly what ran and what did not.

## Stack and architecture decisions

- WXT 0.21.x (Vite-based, cross-browser, MV3), React 19, TypeScript **5.9** (typescript-eslint does not support TS 7 yet; revisit later).
- Vitest + happy-dom + WXT fake browser for unit tests; Playwright with the built extension for e2e.
- `srcDir: 'src'`; imports from `#imports` (WXT virtual module) and `@/` (src alias).
- Access is per site via `optional_host_permissions` (owner decision, M1). Never add `host_permissions` or manifest `content_scripts` to the store build.
- Content script uses `registration: 'runtime'` with no `matches`; the background registers it for allowed sites.
- Settings: one validated object (`src/core/settings.ts`); always read through `getSettings()` / `parseSettings()`.
- Popup/UI colours come only from `src/core/tokens/tokens.css` (generated from Figma).
- e2e tests use `wxt build --mode e2e` (`.output/chrome-mv3-e2e`), which pre-grants localhost test sites and `tabs`. Test-only; never ship it.

## Code rules

- Strict TypeScript; avoid `any`. Validate stored data and messages at runtime (Milestone 1+).
- Everything injected into pages lives behind `html[data-toonify-active]` and one `<style id="toonify-web-style">`. No `!important`, no layout properties, no global overrides.
- Content scripts: no duplicate observers or listeners; clean up on `ctx.onInvalidated`.
- Background service worker can be killed any time: keep state in storage, not variables.
- No eval, no remote code, no telemetry, no network requests without explicit approval. Never upload images or page data without user consent.
- Popup/settings UI: semantic HTML, keyboard operable, visible focus, tokens from the Figma handoff, respect prefers-reduced-motion.

## After every change

1. `npm run compile`
2. `npm run lint`
3. `npm test`
4. `npm run test:e2e` when behaviour in the browser changed
5. Update docs (`docs/`, compatibility matrix) and list known limitations.

## Git

Small commits: `feat: …`, `fix: …`, `test: …`, `docs: …`, `chore: …`. Never commit `.output/`, `.wxt/`, `node_modules/`, secrets or test artifacts.
