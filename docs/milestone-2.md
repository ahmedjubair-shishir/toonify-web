# Milestone 2 - Theme engine (in progress)

Goal (spec 14): token system, Classic Cartoon preset, at least two more presets, safe common-element styling, reset and exclusion logic, dynamic DOM handling.

## Step 1 - Engine + Classic Cartoon (done)

### How it works

1. **Theme = data** (`src/core/themes/`). A theme is a small object: line thickness, corner radius, button lift, ink strength, image colour treatment. New presets are new files registered in `themes/index.ts`.
2. **Classifier** (`src/content/classify.ts`) marks only safe elements with `data-toonify="media" | "button" | "field"`:
   - media: `img` at least 48x48 px rendered, not `role="presentation"`
   - button: buttons / `role="button"` / submit inputs **with visible text**, at least 20 px tall, not nested in another button
   - field: visible text-like inputs, `select`, `textarea`
   - never inside: `contenteditable`, `role="application"`, `aria-hidden="true"`, `[data-toonify-skip]`
   - keeps up with dynamic pages: one MutationObserver on the document, batched once per animation frame; images re-checked on `load`
3. **CSS builder** (`src/content/theme-css.ts`) turns a theme into CSS for marked elements only.
   - Visual properties only (outline, box-shadow, border-radius, filter). Tested: no layout properties, nothing moves.
   - Lines use each element's own text colour (`color-mix(currentColor)`), so they stay readable on dark sites.
   - Shadows switch off on `:focus-visible`, so the site's focus ring shows.
   - No `!important`.
4. **Layer** still has one attribute and one `<style>`. Removing it also clears every mark.

### Tests

- Unit: classifier rules (icons, icon-only buttons, decorative images, nested/tiny buttons, no-go zones), CSS scope, no layout properties, in-place theme swap, mark cleanup.
- E2E (`theme.spec.ts`, fixture `theme.html`): marks and styles, icons/editors untouched, late content picked up, element boxes unchanged, focus ring kept, full cleanup on turning off. Mutation-checked: allowing icon-only buttons makes it fail.

### Known limits (next steps)

- Cards, tables, headings not styled yet (generic "card" detection needs care).
- Image size is checked when added/loaded; images resized later by responsive layouts are not re-checked yet.
- Not yet tried on real sites by the owner.

## Step 2 - Comic Book, Storybook and the style picker (done)

- Theme tokens now also cover hard or soft shadows (`buttonShadow`, `mediaShadow`) and a sepia tint.
  - **Comic Book:** full-strength ink, thicker lines, squarer corners, hard offset shadows, punchy colour.
  - **Storybook:** light lines, very round corners, soft blurred shadows, warm muted images.
- Style is saved **per site** (`sites[site].theme`, validated; unknown ids fall back to Classic Cartoon). Turning a site off and on keeps its style.
- Changing style swaps the CSS in place: no reload, still one `<style>`.
- Popup (Active state): **Style** list with native radio buttons (arrow keys work), a small swatch drawn from each theme's numbers, name and one line. The choice shows instantly; keyboard focus stays while arrowing (tested, and mutation-checked).
- Tests: every theme's CSS is checked for scope, layout properties, `!important` and broken values; settings keep/drop style ids; e2e picks styles, checks the page updates at once, the other site keeps its own style, and the choice survives reload.

## Step 2b - Image redraw (done)

Owner asked whether images can be converted into the chosen style. Options reviewed: (1) browser SVG filters on the device, (2) an on-device AI model, (3) optional cloud AI with consent (Milestone 6). Chose (1) now.

- `src/content/image-filter.ts` builds ONE hidden `<svg>` (child of `<html>`, built with `createElementNS`, no innerHTML) holding the filter `#toonify-web-cartoon`. Marked images get `filter: url(#toonify-web-cartoon) saturate(...) ...`.
- Pipeline: smooth (blur, `edgeMode=duplicate`) → flatten (per-channel bands at band midpoints, mixed with the smoothed original) → ink (edge detection on a softer grey copy, weak edges below `threshold` dropped, optional thicker lines) → ink masked away from the picture border (prevents a fake frame) → multiply → original transparency kept.
- Per-style recipe in theme tokens (`cartoon: { smooth, levels, flatten, edge, threshold, edgeWidth }`), tuned on a real photo: Classic 7 bands / medium ink, Comic Book 5 bands / strong thick ink, Storybook 9 bands / soft light ink.
- Nothing is read or uploaded; works on images from other sites (CDNs) because the browser applies it while drawing. Tested: cross-origin image pixels change, icon pixels unchanged, filter element removed on turning off, restored by the guard if a site deletes it.
- Performance (cloud machine, no GPU, 80 large images, scrolling): median frame 16.7 ms in every style (60 fps); worst frames 25-39 ms (Storybook highest). To re-check on the owner's laptop and on image-heavy sites.
- Known limits: CSS background images and `<picture>`/video are not redrawn yet; per-channel bands can still show small colour blotches on near-white areas (most visible in Comic Book).

### Decision (17 Nov 2026)

Owner reviewed the filter redraw on real pages: not nice enough. Decisions:

- Filter redraw is **off** in all three styles (`cartoon: null`); the engine and tuned recipes stay in code for a possible optional effect.
- The real cartoon redraw will be **cloud AI, on click** ("Cartoonize" on an image, Figma: Image Action Chip + AI consent dialog). Needs consent, a small server holding the API key, and a paid image API.

## AI Cartoonize - server (step 1 of the AI feature, done in code, not deployed)

Owner chose **Gemini** (cloud, on click). Pulled forward from Milestone 6.

- `server/`: Vercel Function `POST /api/cartoonize` (see `server/README.md`). Gemini Interactions API, default model `gemini-3.1-flash-lite-image` (configurable), 1K JPEG output, nearest supported aspect ratio.
- Safety: extension origins only (+ id allow-list before publishing), anonymous install id, Upstash rate limits (per user/hour + global/day; required in production), SSRF protection with redirect re-checks, raster-only, 8 MB cap, safe error messages.
- Tests: 36 server tests with stand-ins for Gemini and the network (mutation-checked on redirect re-validation). **Not yet run against real Gemini** (needs owner's key).
- Extension side (done, tested with a fake server):
  - **Chip:** "Cartoonize" appears on styled photos under the pointer (also below transparent overlays). It lives in a shadow root, closed in store builds, and is built without HTML strings.
  - **Consent:** the first click opens the consent dialog (native `<dialog>`, focus on "Not now", Esc = decline). The answer is saved as `settings.aiConsent`.
  - **Background checks:** sender tab, site on, consent, http(s) image only. It then posts `{imageUrl, style, width, height}` with an anonymous install id.
  - **Swap:** the photo is replaced through a `blob:` URL (works under strict page CSP in Chrome, tested). "Show original" undoes it, and turning the site off or unloading the extension restores every original.
  - **Abuse guard:** only trusted (real) clicks can send an image. Tested, and mutation-checked.
  - **Build config:** `WXT_CARTOONIZE_URL` (`.env.production`; `.env.e2e` points at `tests/fixtures/fake-cartoonize.mjs`).
- Not yet: keyboard access to the chip (planned: right-click menu "Cartoonize this image"), a revoke-consent control in the popup/settings, Firefox check, a real Gemini run.

## AI tool choice (owner request, 18 Nov 2026)

Owner: the user picks the AI tool, then the style; each tool shows whether it needs an API key or an account. Gemini + ChatGPT first. Built before Figma (owner's choice); Figma to follow.

- Popup **AI cartoonize** list (global setting `aiTool`, default Off):
  - Off.
  - **Gemini - my account** / **ChatGPT - my account** ("Free or Pro/Plus account · you paste").
  - Gemini / OpenAI API key ("coming soon", disabled).
  - **Toonify AI** (only when the build has a server URL).
- **Account handoff** (no app may drive a consumer subscription automatically):
  1. The chip says "Cartoonize in Gemini/ChatGPT".
  2. On click, the picture (PNG) and the style instruction go to the clipboard in one item. If the image's server blocks reading it, the background downloads it (raster images only, 8 MB cap, active site only).
  3. The background opens the chosen app (a fixed URL from our list, never one from the page).
  4. A hint explains the next step and has a "Copy instruction" button. If the picture can't be copied, it explains the right-click > Copy image way.
- Toonify AI server calls now also require `aiTool === 'toonify'`.
- Style instructions live in `src/core/ai-tools.ts`; a unit test keeps them identical to `server/lib/styles.ts`.
- Tests: unit (catalogue, fallbacks, prompt sync, app opener and image fetcher rules), e2e (pick Gemini in the popup, clipboard has PNG + text, Gemini tab requested, hint; ChatGPT with an uncopyable image, Copy instruction, Done). Real Gemini/ChatGPT pasting must be checked by the owner (needs his accounts).

## AI paused, Effects added (18 Nov 2026)

Owner tried the account handoff and wants live conversion only. **AI cartoonize is hidden** (`isAiFeatureEnabled()` is true only in e2e builds); its code and tests stay.

New **Effects**: per-site switches in the popup, default off (owner: "let users customize"). All live, on the device, reversible, no new permissions.

| Effect           | How                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hand-drawn lines | Rough double-stroke SVG drawn as the background of marked buttons and fields (replaces the ring, keeps the lift). Fixed-seed SVG turbulence wobble on photos. Wavy underline on links inside body text.      |
| Sticker photos   | White border + soft shadow (box-shadow), tilt ±1.2° (`transform`), straightens on hover                                                                                                                      |
| Bouncy buttons   | Spring `transform` on hover and press, only when the user has not asked for reduced motion                                                                                                                   |
| Playful headings | Fredoka (OFL, bundled in `public/fonts/` with its licence), Latin and Latin-ext ranges only. The classifier marks h1-h4 as `heading` only if their letters are ≥80% Latin, so other scripts keep their font. |
| Comic background | One fixed, click-through `html::after` overlay: grid (Classic), halftone (Comic Book), paper grain (Storybook). Multiply on light pages, screen on dark ones.                                                |

- Light/dark page detection (`page-scheme.ts`): `html[data-toonify-scheme]`, so ink is dark on light pages and light on dark ones.
- Manifest: `web_accessible_resources` for `fonts/*.woff2` (no permission warning).
- Tests: effects CSS safety per style, per-site settings, Latin detection (Bengali, Arabic, Japanese), scheme detection. E2E: each switch on/off from the popup, remembered after reload, everything removed when the site is turned off, strict-CSP page (font and lines still work), dark page gets light ink.
- One e2e run had a single unexplained failure on a cold start; 3 later full runs were clean. Watch it.

## All 11 styles (18 Nov 2026)

Added the remaining presets from spec 4.1 / Figma: **Watercolor, Pencil Sketch, Pop Art, Oil Painting, Vintage Poster, Cel-Shaded, Monochrome Ink, Renaissance Painting** (descriptive name per the spec's naming note).

- New theme tokens:
  - `ink`: a fixed ink colour, e.g. graphite, sepia brown, pure black.
  - `frame`: a photo outline colour, e.g. gold.
  - `media.grayscale`, `media.brightness`, `media.hueRotate`.
  - Textures `canvas`, `newsprint`, `pop`.
- Ink is set once as CSS variables on `<html>` (`--toonify-ink`, `--toonify-ink-soft`, `--toonify-frame`). On dark pages a fixed ink switches back to the element's text colour.
- Each style has a matching AI instruction (kept for the paused AI feature; still synced with the server by a test).
- Tests: all 11 run through the same safety checks (scope, no layout properties, no `!important`, no broken values); root rules may only set Toonify's own variables; textures differ per kind. 200 unit, 18 e2e passing.
- UX note for the owner: the popup style list is now long (11 rows). The Figma preset grid (Popup 06) is the planned fix.

## Icon swap (owner request, 18 Nov 2026)

Popup > **Icons**: pick a free icon **set** (Original, Lucide, Phosphor, Tabler) and a **look** (Plain, Cartoon, Sketched, Animated), per site. Any look works with any set. Style tiles now show an icon above the name, centred.

- **Finding icons** (`src/content/icon-meaning.ts`, `classify.ts`): small svg, font icons (`<i class="fa ...">`, Material ligatures), and images under 48px. Only while the feature changes something; otherwise icons are not even looked for.
- **Meaning** (`data-toonify-icon="search"` etc., 48 meanings): read from names sites already use - class names, sprite links (`#icon-search`), `data-icon`, ligature text, then `aria-label` / `title` / `alt`, then the label of an icon-only button. Never from pixels. Unknown icons get `other` and keep their drawing (looks still apply).
- **Swap** (`src/content/icons-css.ts`): the new icon is a CSS mask filled with the text colour, so it suits light and dark sites. The old drawing is hidden (svg shapes invisible, font glyph transparent, image pushed out of its box). No layout changes; a site's own transform (e.g. a flipped chevron) stays.
- **Looks**: cartoon (thicker lines + drop shadow) and sketched (noise wobble) are drawn inside the icon file, because a mask would cut off an outside filter. For the site's own icons, the looks are CSS filters. Animated: pop-in and a wiggle on hover/focus, using `rotate`/`scale` (not `transform`), only without reduced motion.
- **Icon files**: generated at build time from `src/core/icon-sets.data.ts` (432 files: 3 sets x 3 drawn looks x 48) by a WXT `build:publicAssets` hook, served as web-accessible extension files.
  - Decision: not data: URLs. A strict site policy (`img-src 'self'`) blocked data: masks in about 1 of 5 loads, and the icon vanished. Extension files loaded 8 of 8 times under the same policy.
  - Trade-off: like the fonts, these files are visible to pages (a site could detect that Toonify is installed).
- **Icon data**: `scripts/build-icon-sets.mjs` (`npm run icons:build` after `npm i --no-save lucide-static @phosphor-icons/core @tabler/icons`). The packages are not dependencies. Licences: Lucide ISC, Phosphor MIT, Tabler MIT, in `THIRD_PARTY_NOTICES.md`.
- **Known limits**: a site rule on the icon's own background (e.g. `#id { background: ... }`) beats ours and can hide the swapped icon; meanings outside the 48 stay original.
- Tests: 247 unit, 22 e2e passing (e2e checks real pixels: old drawing gone, new outline drawn, nothing moved, class change play -> pause, strict policy, reduced motion, popup keyboard).

## Popup tabs (owner feedback, 19 Nov 2026)

The popup body was one long scroll, so Effects and Icons were easy to miss. Style, Effects and Icons are now **tabs** under the Site Toggle.

- Each tab shows what is set without opening it: the style name, "Off" / "2 on" for effects, the icon set (and look).
- WAI-ARIA tabs: Left/Right/Home/End move and open; only the open tab is in the Tab order; panels are labelled by their tab.
- The last open tab is remembered between popup openings (popup localStorage; falls back to Style).
- Section headings stay for screen readers only (the tab already names the panel).
- Tests: new e2e `tabs.spec.ts`; effects and icons tests open their tab first. 247 unit, 23 e2e passing.

## Original style and custom icon sets (owner request, 19 Nov 2026)

**Original style.** A new first style tile, "Original" = the site keeps its own look. It is every site's default, so turning Toonify on for a site changes nothing until the user picks a style, effect or icon set. Effects and icons still work with Original (ink comes from Classic Cartoon's tokens; no photo, button or field rules). Missing, "original" or removed style ids all mean Original. Behaviour change: sites that never picked a style used to get Classic Cartoon.

**Custom icon sets.** Icons > Set > "Add custom": the user pastes

- an Iconify set name or link (mdi, ph, https://icon-sets.iconify.design/mdi/) - one request to api.iconify.design, or
- a CDN link with `{name}` where the icon name goes (e.g. jsDelivr / unpkg).

Toonify tries the usual names for each of the 48 meanings (`CANDIDATE_NAMES`, e.g. search / magnifying-glass / magnify) and keeps the first that exists. Icons are downloaded once in the popup, cleaned (only drawing elements; no scripts, links, images, handlers, styles), and saved in `storage.local` (`customIconSets`, max 12 sets, 20 KB per icon). Saved sets appear as tiles for every site; "Your custom sets" lists them with Remove (sites using a removed set go back to their own icons). Meanings a set lacks keep the site's icon.

- Privacy: only the link the user typed is contacted, once, from the popup. Websites never contact it: icons travel inside our CSS as data: URLs.
- Security: https only (http allowed for localhost, for tests).
- Strict site policies (`img-src 'self'`) block data: images. The content script listens for `securitypolicyviolation` and switches custom icons off on that page, so the site's own icons come back instead of blanks. Tested 5 of 5 under that policy; a mutation check (fallback disabled) fails the test, so the fallback is what keeps icons visible.
- Built-in sets are unaffected (extension files, work under strict policies).
- Tests: 266 unit (parsing, cleaning, Iconify and CDN downloads with mocked fetch, save/remove, CSS only for available meanings), 25 e2e (add from a local fake CDN, pixels, persistence, remove; strict policy).

## Clearer custom sets, calmer colours (owner feedback, 19 Nov 2026)

- The add form now starts with **one-click popular sets** (Material Design, Hugeicons, Font Awesome, Remix, Bootstrap, Heroicons, Iconoir, Carbon, Ionicons, Boxicons, Material Symbols, all from Iconify), then "Or paste a link" with an Add button. Errors show right under the field. "Which links work?" explains the options. The name is filled in automatically.
- Icon font / CSS links (e.g. `https://use.hugeicons.com/font/icons.css`) hold no SVG drawings. Links from known libraries are matched to the same set on Iconify; unknown ones get a plain explanation.
- Iconify lookups also try numbered names (`search-01`), as Hugeicons uses.
- Tabs are underlined: the open tab has accent text and a 2px underline. Tiles are neutral grey until chosen; only the chosen tile uses the accent.

## Set actions and links hidden (owner feedback, 19 Nov 2026)

- "Add new" and "Edit" are small text buttons beside the Set heading (no big Add tile). Edit shows a remove (x) badge on added sets only; built-in sets can't be removed. Popular chips already added show a check and are disabled.
- Pasting links is **hidden for now**. The owner wanted an icon-font CDN link (e.g. a Hugeicons or Flaticon CSS link) to restyle icons by name. Not possible without changing pages: a font holds letters, not pictures; most site icons are svg or img, which can't show font letters without replacing the page's elements, and the font would load from the CDN on every site (privacy, and many sites block it). The link code (Iconify links, `{name}` SVG folders) stays in `custom-icons.ts` and its unit tests, ready to bring back.

## Next steps

3. Real-site pass (news, shopping, video, docs, social) and tuning.
4. Reset and exclusion polish from that pass (e.g. images resized after load).
5. Update the Figma popup (Style list) to match, until the Milestone 3 preview picker replaces it.
