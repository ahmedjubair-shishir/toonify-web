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
- Next: extension side - Cartoonize chip, first-use consent, background call, swap image with undo, restore on off/reset.

## Next steps
3. Real-site pass (news, shopping, video, docs, social) and tuning.
4. Reset and exclusion polish from that pass (e.g. images resized after load).
5. Update the Figma popup (Style list) to match, until the Milestone 3 preview picker replaces it.
