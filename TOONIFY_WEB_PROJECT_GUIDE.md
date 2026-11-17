# Toonify Web --- Product & Engineering Specification

**Document type:** Product requirements, UX/UI specification,
architecture guide, implementation plan, and AI coding instructions\
**Status:** Initial project specification\
**Working product name:** Toonify Web (rename before public release if
needed)\
**Primary development environment:** Claude + Visual Studio Code\
**Initial technical direction:** TypeScript, React, browser extension
APIs, local image processing with optional AI enhancement

------------------------------------------------------------------------

## 1. Product vision

Toonify Web is a browser extension that gives websites and web
applications a playful, illustrated visual identity while preserving
their original content, structure, navigation, and functionality.

A user can activate Toonify on a website and apply a visual preset. The
extension can restyle interface elements, apply cartoon-inspired
treatments to images and icons where technically possible, use
script-aware playful typography, and add optional lightweight animated
effects.

The product should feel like a visual layer over the original
website---not a replacement website, proxy, or redesign.

### 1.1 Product promise

> Make the web feel illustrated, expressive, and alive---without making
> it harder to use.

### 1.2 Core principles

1.  **Preserve function first.** Links, forms, buttons, menus, text
    selection, scrolling, media controls, and application workflows must
    continue to work.
2.  **Transform progressively.** Start with safe, reversible CSS
    changes; use image processing and animation as optional layers.
3.  **Respect the original content.** Do not rewrite, translate, remove,
    or obscure information.
4.  **Make effects controllable.** Users can choose a preset, adjust
    intensity, disable individual effects, and restore the original
    appearance.
5.  **Protect privacy.** Local processing is the default. Never upload
    page content or images to an AI service without clear, informed,
    per-feature consent.
6.  **Accessibility is a product requirement.** Cartoon styling must not
    reduce readability, contrast, keyboard access, or motion comfort.
7.  **Be honest about compatibility.** No extension can guarantee
    identical behavior on every website, browser, or mobile device.
    Detect limitations and degrade gracefully.
8.  **Performance matters.** Avoid expensive processing on every DOM
    mutation or animation frame.

------------------------------------------------------------------------

## 2. Product goals and non-goals

### 2.1 Goals

-   Provide one-click enable/disable for the current site.
-   Offer a small set of recognizable visual presets, with room to add
    more.
-   Restyle common web UI elements consistently.
-   Apply local cartoon-like image effects where feasible.
-   Offer optional AI-enhanced image transformation as a separate,
    consent-based capability.
-   Provide script-aware font choices and safe fallbacks for multiple
    writing systems.
-   Add subtle optional background and pointer effects.
-   Allow per-site settings, exclusions, and a reset action.
-   Work on a broad range of websites, including static pages and
    dynamic single-page applications.
-   Build a maintainable cross-browser codebase and test it
    systematically.
-   Provide an accessible, understandable extension popup and settings
    page.

### 2.2 Non-goals for the first release

-   Rebuilding or redesigning a website's layout.
-   Replacing website text or translating content.
-   Guaranteeing cartoonization of DRM-protected video, cross-origin
    embedded content, closed shadow roots, canvas-based applications, or
    every image format.
-   Injecting code into browser-internal pages, extension stores, or
    other restricted origins.
-   Running a cloud AI model without user consent.
-   Supporting every mobile browser. Mobile extension availability
    depends on each browser and operating system.
-   Creating a general-purpose website builder or image editor.

------------------------------------------------------------------------

## 3. Target users and use cases

### Primary users

-   People who enjoy playful, illustrated visual experiences.
-   Users who want to personalize the appearance of websites.
-   Students and casual web users who want a more expressive browsing
    environment.
-   Users who want a reversible visual treatment rather than a permanent
    website redesign.

### Core user journeys

**Journey A --- Quick activation** 1. User installs the extension. 2.
User opens a normal website. 3. User opens the extension popup. 4. User
turns Toonify on. 5. The selected preset is applied. 6. User can turn it
off or reset the site at any time.

**Journey B --- Choose a look** 1. User opens the popup. 2. User browses
visual preset previews. 3. User selects a preset. 4. The current page
updates. 5. The selection is remembered according to the user's
settings.

**Journey C --- Customize effects** 1. User opens settings. 2. User
adjusts UI intensity, image effect, typography, animation, and optional
pointer effects. 3. A preview or immediate page update communicates the
result. 4. User can reset individual controls or restore defaults.

**Journey D --- AI image enhancement** 1. User opens image settings. 2.
The extension explains what AI enhancement does and where processing
occurs. 3. User explicitly enables the feature and reviews the privacy
notice. 4. Only eligible images are sent, only after the user's action
and according to the selected processing mode. 5. The extension shows
progress and a clear way to cancel or revert.

------------------------------------------------------------------------

## 4. Visual direction and preset system

The default direction is **classic cartoon**: friendly outlines,
simplified color relationships, rounded forms, gentle shadows, and
playful but restrained motion.

Do not make every site look identical. The preset should change the
visual treatment while the original page's layout, hierarchy, and
content remain recognizable.

### 4.1 Recommended presets

Build the preset system so new styles can be added as configuration
rather than rewriting the transformation engine.

  -----------------------------------------------------------------------
  Preset                  Visual language         Suggested use
  ----------------------- ----------------------- -----------------------
  Classic Cartoon         Clean outlines,         Default
                          simplified colors,      
                          rounded corners, soft   
                          shadows                 

  Comic Book              Ink outlines, halftone  Expressive pages
                          accents, bold contrast, 
                          comic-style emphasis    

  Storybook               Soft colors, paper-like Reading and browsing
                          surfaces, gentle        
                          illustration feel       

  Watercolor              Soft edges, blended     Calm visual treatment
                          colors, subtle paper    
                          texture                 

  Pencil Sketch           Graphite-like edges,    Minimal, artistic look
                          muted surfaces,         
                          hand-drawn details      

  Pop Art                 Strong color blocks,    High-energy look
                          halftone patterns,      
                          graphic contrast        

  Oil Painting            Painterly image         Image-focused browsing
                          treatment, textured     
                          accents                 

  Vintage Poster          Limited palette, print  Decorative look
                          texture, bold graphic   
                          forms                   

  Cel-Shaded              Flat color regions and  Game/anime-inspired
                          defined edges           look

  Monochrome Ink          Black/white or          Low-color visual mode
                          limited-ink treatment   
  -----------------------------------------------------------------------

**Naming note:** A style such as "Mona Lisa" is better treated as an
*artistic treatment* (for example, Renaissance oil-painting / museum
portrait) rather than using a copyrighted or trademarked style name as
the product's preset identity. The Mona Lisa itself is a public-domain
artwork, but avoid implying an official association. Prefer a
descriptive preset name such as **Renaissance Painting**.

### 4.2 Special effects and playful overlays

These are independent effect layers, not necessarily full visual
presets. Users should be able to combine a preset with one or more
optional effects.

  -----------------------------------------------------------------------
  Effect                  Description             Default
  ----------------------- ----------------------- -----------------------
  Star Trail              Small, short-lived star Off
                          particles follow        
                          pointer movement        

  Sparkle Dust            Occasional subtle       Off
                          sparkles in a limited   
                          decorative area         

  Floating Doodles        Very slow, low-opacity  Off
                          cartoon shapes in the   
                          page background         

  Soft Cloud Drift        Gentle cloud-like       Off
                          background shapes or    
                          gradients               

  Paper Texture           Very subtle paper grain Off
                          or illustrated surface  
                          texture                 

  Comic Burst             Optional decorative     Off
                          burst for selected      
                          interactions, never     
                          covering controls       

  Gentle Wiggle           Small interaction       Off
                          feedback on selected    
                          decorative elements     

  Cursor Accent           Custom pointer          Off
                          decoration that does    
                          not replace the system  
                          cursor                  
  -----------------------------------------------------------------------

Effects must never obscure text, controls, focus indicators, or
important content. Do not apply effects over text-heavy reading areas by
default.

### 4.3 Preset configuration model

Represent presets as typed configuration objects. Avoid hardcoding
style-specific conditions throughout the codebase.

A preset may define: - Color palette and semantic color mapping. -
Border and outline treatment. - Corner radius scale. - Shadow style. -
Image processing parameters. - Typography family preferences by
script. - Texture and overlay settings. - Motion profile. -
Supported/unsupported effect flags.

Keep the original page's semantic states recognizable: success, warning,
error, disabled, selected, focus, visited, and destructive actions.

------------------------------------------------------------------------

## 5. Functional requirements

### 5.1 Extension controls

**MVP requirements** - Global enable/disable. - Current-site
enable/disable. - Preset selection. - Intensity control. - Image
treatment toggle. - Animation toggle. - Typography toggle. - Reset
current site. - Clear status when a site cannot be transformed fully.

**Later enhancements** - Per-site profiles. - Preset favorites. -
Import/export user settings. - Scheduled or automatic activation. -
Advanced image settings. - Optional AI enhancement. - Keyboard
shortcut. - Sync settings across browsers only if a privacy-conscious
sync mechanism is implemented.

### 5.2 DOM and UI transformation

The extension may safely restyle common elements: - `body`, main page
backgrounds, and major content surfaces. - Buttons, links, form
controls, cards, panels, and navigation surfaces. - Borders, radii,
shadows, and selected decorative pseudo-elements. - SVG icons where CSS
filters or safe SVG styling are suitable. - Common image presentation
styles.

Requirements: - Do not globally override every CSS property. - Do not
change `display`, `position`, `z-index`, `overflow`, `width`, or
`height` indiscriminately. - Avoid changing line-height, font-size, or
letter spacing in ways that cause clipping. - Preserve `:focus-visible`,
disabled, selected, invalid, and hover states. - Use a namespaced class
or attribute such as `data-toonify-active` on the document root. - Keep
injected CSS isolated and easy to remove. - Do not overwrite the site's
inline styles unless strictly necessary. - Use a MutationObserver
sparingly for dynamic content; debounce and batch work. - Avoid
observing attributes or subtrees that the extension itself continuously
changes. - Support single-page application navigation and route changes
without duplicate observers or repeated style injection. - Provide
site-specific exclusions for pages where transformation causes breakage.

### 5.3 Image transformation

Image handling is the most technically challenging feature. It must be
built as a progressive system.

**Tier 1 --- CSS-only treatment** - Apply safe visual filters to
eligible images. - Fast and reversible. - Does not create a true cartoon
illustration. - Should be the fallback for unsupported images.

**Tier 2 --- Local image processing** - Use Canvas or another suitable
local processing pipeline for eligible images. - Explore color
quantization, edge detection, smoothing, and palette reduction. -
Process only visible or near-visible images. - Use IntersectionObserver
and lazy processing. - Cache results in memory with strict size
limits. - Avoid repeatedly processing the same source. - Preserve
original image dimensions, aspect ratio, alt text, loading behavior, and
layout. - Revoke temporary object URLs and release canvas resources when
no longer needed. - Handle CORS restrictions. A cross-origin image may
not be readable by canvas unless the server permits it; do not bypass
browser security. - Do not assume CSS filters equal a genuine AI
illustration.

**Tier 3 --- Optional AI transformation** - Treat as a later, separately
enabled feature. - Explain whether processing is on-device or sent to a
third-party service. - Obtain explicit consent before any upload. - Do
not send full page screenshots, surrounding page content, cookies,
authentication data, or unrelated images. - Provide a per-image action
or clearly scoped user setting. - Provide cancellation, error handling,
cost/usage information, and a way to restore the original. - Never
silently upload images in the background. - Do not store transformed
images remotely longer than necessary; document retention and
deletion. - Make API keys and secrets server-side. Never embed private
provider keys in extension source code.

**Important image edge cases** - `img`, `picture`, `srcset`, lazy-loaded
images. - CSS background images. - SVG images and inline SVG. - Animated
GIF and animated WebP. - AVIF and other browser-supported formats. -
Video posters and video frames. - Canvas and WebGL content. -
Cross-origin images. - Images inside iframes and shadow DOM.

The MVP must document which cases are supported, partially supported, or
unsupported. Do not claim universal image conversion.

### 5.4 Typography and multilingual support

The user wants playful font choices while retaining the original
language.

Requirements: - Never translate or transliterate page text. - Use
script-aware font stacks and verify glyph coverage. - Support Unicode
and mixed-script text. - Preserve right-to-left direction and
bidirectional text behavior. - Preserve combining marks, diacritics,
shaping, ligatures, and line-breaking behavior. - Do not apply one Latin
display font to every language. - Include a sensible fallback stack for
Latin, Bengali, Arabic, Devanagari, CJK, and other scripts as the
product expands. - Test Bengali text specifically, including conjuncts
and vowel signs. - Do not use a font that lacks glyphs for the current
script. - Do not force letter spacing on scripts where it damages
shaping. - Provide a typography-off option. - Provide a readable mode
that prioritizes legibility over decorative style. - Bundle fonts only
when their licenses allow redistribution. Record license and source
information.

Example conceptual stacks (verify actual font files and licenses before
shipping): - Latin: a playful rounded sans-serif followed by system
sans-serif fallbacks. - Bengali: a Bengali-capable font such as Noto
Sans Bengali, followed by system Bengali fallbacks. - Arabic: an
Arabic-capable family such as Noto Sans Arabic, followed by system
fallbacks. - Devanagari: a Devanagari-capable family such as Noto Sans
Devanagari. - CJK: suitable Noto Sans CJK or system fallback families.

Avoid using decorative fonts for long paragraphs, legal text, financial
figures, medical information, code, or dense dashboards.

### 5.5 Background animation and pointer effects

-   Default all decorative animation to off or very subtle.
-   Respect `prefers-reduced-motion`.
-   Provide a visible master motion toggle.
-   Do not animate large portions of the page continuously.
-   Prefer transform and opacity for animation.
-   Avoid layout-triggering animation.
-   Pause or reduce effects when the tab is hidden.
-   Do not create flashing, strobing, or rapid color changes.
-   Keep decorative elements `pointer-events: none` and out of the
    accessibility tree when appropriate.
-   Never replace the system pointer in a way that reduces precision or
    accessibility.
-   Star trails should be short-lived, low-density, non-blocking, and
    disabled for touch-only devices unless a useful touch equivalent is
    designed.

### 5.6 Settings persistence

Store only the settings needed to provide the product: - Global enabled
state. - Selected preset. - Intensity. - Per-feature toggles. - Per-site
preferences and exclusions. - Accessibility preferences. - Optional AI
consent state and relevant configuration.

Use browser extension storage APIs through a compatibility layer.
Validate stored data and handle missing, outdated, or corrupted
settings. Provide a reset option. Do not store browsing history or page
contents.

------------------------------------------------------------------------

## 6. UX principles

### 6.1 Core UX principles

1.  **User control:** Every major transformation can be turned off or
    reversed.
2.  **Predictability:** The preview should represent the effect users
    will receive.
3.  **Progressive disclosure:** Keep the popup simple; place advanced
    controls in settings.
4.  **Recognition over recall:** Use clear preset names, visual
    previews, and understandable icons.
5.  **Feedback:** Show whether the extension is active, processing,
    paused, or unsupported.
6.  **Error prevention:** Avoid transformations likely to break form
    controls or dense interfaces.
7.  **Consistency:** Presets should use a shared system for buttons,
    surfaces, focus, and semantic states.
8.  **Performance transparency:** Show a useful status if image
    processing is still running.
9.  **Easy recovery:** Provide one-click disable and reset.
10. **Respect:** Do not use manipulative defaults, surprise uploads, or
    hidden background processing.

### 6.2 Popup information architecture

Recommended popup structure:

**Header** - Product mark and name. - Master on/off switch. - Current
site status.

**Main controls** - Selected preset card with preview. - Preset
selector. - Intensity slider.

**Quick effects** - Cartoon UI. - Image treatment. - Playful
typography. - Background motion. - Star Trail.

**Footer** - Reset this site. - Open settings. - Help / compatibility
information.

Keep the popup compact. Do not expose every advanced parameter at once.

### 6.3 Settings page structure

1.  Appearance
2.  Presets
3.  Images
4.  Typography & Languages
5.  Motion & Effects
6.  Accessibility
7.  Site Rules & Exclusions
8.  Privacy
9.  About, licenses, and diagnostics

### 6.4 Interaction guidelines

-   Use plain-language labels, not internal technical terminology.
-   Make the current state obvious.
-   Use switches for binary settings and sliders only when the scale has
    a meaningful, understandable effect.
-   Show the selected preset with more than color alone.
-   Provide keyboard-operable controls.
-   Avoid hover-only functionality.
-   Keep destructive actions separate and confirm only when the action
    is genuinely consequential.
-   Provide a clear reset-to-defaults action.
-   Use short, non-blocking status messages.
-   Avoid unnecessary onboarding. A short first-run explanation is
    sufficient.

------------------------------------------------------------------------

## 7. UI design system

The extension interface should feel contemporary, friendly, polished,
and lightweight.

### 7.1 Visual direction

-   Friendly illustrated brand language.
-   Clean hierarchy and generous spacing.
-   Rounded but not excessively pill-shaped components.
-   Soft elevation rather than heavy shadows.
-   Clear typography with restrained playful accents.
-   Small, purposeful motion.
-   Strong contrast for text and controls.
-   Consistent icon style.

Do not follow trends at the expense of usability. Avoid excessive
glassmorphism, low-contrast pastel text, oversized gradients, decorative
clutter, and unnecessary animation.

### 7.2 Design tokens

Create centralized tokens for: - Color: surface, elevated surface, text,
muted text, border, accent, focus, success, warning, error. - Spacing: a
consistent 4px-based scale. - Radius: small, medium, large, pill. -
Shadow: subtle, medium, overlay. - Typography: body, label, heading,
display, monospace. - Motion: duration, easing, reduced-motion
alternative. - Z-index: popup layers and settings-page layers.

Use semantic tokens rather than hardcoded colors inside components.
Ensure light and dark modes are considered.

### 7.3 Responsive UI

-   Popup should fit supported browser popup dimensions.
-   Settings page should work on narrow and wide viewports.
-   Avoid fixed-width layouts.
-   Controls should have adequate touch targets where the browser
    environment supports touch.
-   Test zoom up to 200% and narrow viewport behavior.
-   Avoid horizontal scrolling for normal settings content.

------------------------------------------------------------------------

## 8. Accessibility requirements

Target **WCAG 2.2 AA** for the extension's own interface and use the
same principles when transforming websites. A browser extension cannot
guarantee that the underlying site becomes fully accessible.

### 8.1 Required accessibility behavior

-   Keyboard access to every extension control.
-   Visible focus indicators with sufficient contrast.
-   Correct accessible names, roles, states, and relationships.
-   Text contrast at least 4.5:1 for normal text and 3:1 for large text,
    subject to WCAG definitions and exceptions.
-   Non-text control boundaries and meaningful graphical indicators
    should meet applicable contrast requirements.
-   Do not communicate state using color alone.
-   Support browser zoom and text resizing.
-   Respect reduced-motion preferences.
-   No flashing content that could trigger seizures.
-   Logical focus order.
-   Proper labels and error messages.
-   Avoid focus traps.
-   Screen-reader announcements for important status changes, not every
    minor update.
-   Decorative graphics hidden from assistive technology.
-   No essential information conveyed only by animation, hover, or image
    appearance.

### 8.2 Readability safeguard

Provide an **Accessibility / Readability Mode** that: - Reduces or
disables decorative effects. - Uses highly readable script-appropriate
fonts. - Preserves or increases contrast. - Avoids image processing on
text-containing images where it could reduce legibility. - Preserves
focus indicators and control states. - Can disable typography changes
independently of other visual treatments.

### 8.3 Motion safeguard

-   Honor `prefers-reduced-motion: reduce`.
-   Provide an in-extension motion setting.
-   When reduced motion is active, remove nonessential continuous motion
    and pointer trails.
-   Do not rely only on the operating system preference; allow the user
    to control the extension directly.
-   Avoid parallax and auto-moving backgrounds by default.

------------------------------------------------------------------------

## 9. Technical architecture

### 9.1 Recommended stack

  -----------------------------------------------------------------------
  Layer                               Recommendation
  ----------------------------------- -----------------------------------
  Language                            TypeScript with strict mode

  Extension standard                  WebExtensions APIs; Manifest V3
                                      where supported

  UI                                  React

  Build tooling                       Vite with a browser-extension build
                                      integration

  Styling                             CSS Modules or well-scoped CSS;
                                      optional utility CSS for extension
                                      UI

  Unit tests                          Vitest

  Browser automation                  Playwright

  Linting                             ESLint

  Formatting                          Prettier

  Type checking                       TypeScript

  Version control                     Git + GitHub
  -----------------------------------------------------------------------

Do not introduce a large framework or dependency without a clear need.
Check current browser documentation and the selected build tool's
maintenance status before committing to versions.

### 9.2 Cross-browser strategy

Use a browser API compatibility layer. Do not scatter browser-specific
checks throughout application logic.

Potential targets: - Chrome desktop. - Microsoft Edge desktop. - Brave
desktop. - Firefox desktop. - Safari on macOS through Safari Web
Extensions. - Mobile browsers that explicitly support extensions,
subject to their own restrictions.

**Important platform limitation:** "All devices and browsers" is a
long-term compatibility goal, not a guarantee. Chrome on Android does
not generally support ordinary Chrome desktop extensions. Safari on
iOS/iPadOS has its own extension distribution and packaging process.
Firefox for Android supports some extensions, with its own compatibility
constraints. Validate each platform independently.

Create separate packaging/build targets where required. Maintain a
documented support matrix.

### 9.3 Extension components

**Background/service worker** - Handle extension lifecycle and
messages. - Coordinate settings and tab-specific actions. - Avoid
long-running assumptions; service workers may be suspended and
restarted.

**Content script** - Detect page readiness. - Apply and remove the
transformation layer. - Handle safe DOM observation. - Communicate with
the background context. - Avoid accessing page secrets or collecting
page content.

**Popup UI** - Quick controls and status. - Current-site actions. -
Preset selection.

**Options/settings page** - Advanced configuration. - Accessibility and
privacy settings. - Site rules and exclusions.

**Shared core** - Typed settings model. - Preset definitions. - Theme
token generation. - Browser API adapter. - Message contracts. -
Validation and migration.

**Image engine** - Eligibility checks. - Local processing pipeline. -
Caching and cleanup. - Optional AI provider adapter, added only after
privacy and security design.

### 9.4 Suggested folder structure

``` text
toonify-web/
├── public/
│   ├── icons/
│   └── assets/
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── content/
│   │   ├── index.ts
│   │   ├── apply-theme.ts
│   │   ├── dom-observer.ts
│   │   ├── exclusions.ts
│   │   └── content.css
│   ├── popup/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── popup.css
│   ├── options/
│   │   ├── App.tsx
│   │   ├── sections/
│   │   └── options.css
│   ├── core/
│   │   ├── browser/
│   │   ├── messaging/
│   │   ├── settings/
│   │   ├── presets/
│   │   ├── tokens/
│   │   └── validation/
│   ├── image/
│   │   ├── eligibility.ts
│   │   ├── local-pipeline.ts
│   │   ├── cache.ts
│   │   └── cleanup.ts
│   ├── effects/
│   │   ├── star-trail.ts
│   │   ├── background-effects.ts
│   │   └── motion-preferences.ts
│   ├── typography/
│   │   ├── script-detection.ts
│   │   └── font-stacks.ts
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── compatibility-matrix.md
│   ├── privacy.md
│   └── release-checklist.md
├── manifest/
├── .github/
│   └── workflows/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── CLAUDE.md
└── TOONIFY_WEB_PROJECT_GUIDE.md
```

This is a proposed structure, not a requirement to create every file
immediately. Claude should create only the files needed for the current
milestone.

### 9.5 Messaging and settings contracts

Define typed message contracts for: - Get current settings. - Update
settings. - Enable/disable current site. - Apply preset. - Reset current
site. - Report processing status. - Report unsupported page conditions.

Validate all messages and settings at runtime. Treat messages from
content scripts and stored settings as untrusted input.

------------------------------------------------------------------------

## 10. Compatibility and resilience

Websites differ significantly. Build for graceful degradation rather
than assuming a uniform DOM.

### 10.1 Known limitations

-   Browser-internal pages and extension store pages generally cannot be
    modified.
-   Cross-origin iframe content may not be accessible.
-   Closed shadow roots cannot be inspected.
-   Canvas/WebGL content may not expose individual visual elements.
-   Some sites use highly dynamic DOM structures or custom rendering.
-   Some sites use strict Content Security Policies.
-   Image CORS restrictions may prevent local pixel processing.
-   Some sites depend on exact CSS values for layout or state.
-   Some fonts may be loaded dynamically or have unusual script
    coverage.
-   DRM and protected media must not be bypassed.

### 10.2 Resilience rules

-   If a transformation fails, remove the failing layer and leave the
    original page usable.
-   Never block page loading while processing images.
-   Use timeouts and bounded retries.
-   Do not retry indefinitely.
-   Avoid broad `!important` rules wherever possible.
-   Keep an emergency disable path.
-   Maintain a per-site exclusion list.
-   Log diagnostic events without collecting page content or personal
    data.
-   Make debugging optional and user initiated.

------------------------------------------------------------------------

## 11. Privacy and security

Treat privacy as a core product feature.

-   Request the minimum browser permissions needed.
-   Prefer optional host permissions and user-initiated access where
    feasible.
-   Explain why each permission is required.
-   Do not collect browsing history, passwords, form values, cookies, or
    page text.
-   Do not transmit page content to a server.
-   Local image processing is the default.
-   AI processing requires explicit opt-in and clear disclosure.
-   Use secure transport for any remote service.
-   Keep provider secrets on a backend, never in the extension bundle.
-   Avoid remote executable code and remotely hosted scripts.
-   Sanitize and validate external inputs.
-   Apply a Content Security Policy appropriate to the extension.
-   Do not weaken the host website's security controls.
-   Provide a privacy policy before store publication.
-   Provide a way to disable and clear locally stored extension
    settings.

Before release, review current Chrome Web Store, Firefox Add-ons, and
Apple App Store/Safari extension policies. Permission and privacy
declarations must match actual behavior.

------------------------------------------------------------------------

## 12. Performance requirements

Set measurable targets after a baseline prototype, then track
regressions.

Initial engineering targets: - Popup should feel immediate and remain
responsive. - Turning off the extension should remove its styling
promptly. - No repeated full-document scans on every DOM mutation. -
Image processing should happen only for eligible visible images. -
Processing should be cancellable and bounded. - Avoid large unbounded
caches. - Do not animate every element. - Avoid unnecessary network
requests. - Avoid persistent background polling. - Monitor CPU, memory,
page responsiveness, and layout shifts.

Use: - IntersectionObserver for image visibility. - Debounced/batched
MutationObserver callbacks. - `requestAnimationFrame` only for visual
updates that need it. - CSS transforms and opacity for motion. -
Resource cleanup and object URL revocation. - A bounded cache with a
documented eviction strategy.

Do not promise a specific performance percentage until it has been
measured on representative devices.

------------------------------------------------------------------------

## 13. Testing strategy

Testing must cover more than whether the extension loads.

### 13.1 Test website categories

Create a repeatable test set: - Simple static content website. -
News/article website. - E-commerce listing and product detail. -
Dashboard with dense tables and charts. - Web application with forms and
dialogs. - Social feed with infinite scroll. - Single-page application
with route changes. - Website with dark mode. - Website with complex
navigation and dropdowns. - Website with embedded media and iframes. -
Bengali-language page. - Arabic right-to-left page. - CJK-language
page. - Page with many images and lazy loading.

Use public test pages or controlled local fixtures. Do not use real user
accounts or private production data for testing.

### 13.2 Browser and device matrix

Track actual results rather than marking support based on assumptions.

  -----------------------------------------------------------------------
  Platform                Initial target          Validation
  ----------------------- ----------------------- -----------------------
  Chrome desktop          Yes                     Required

  Edge desktop            Yes                     Required

  Brave desktop           Best effort             Required before
                                                  claiming support

  Firefox desktop         Planned                 Separate build and
                                                  tests

  Safari macOS            Planned                 Safari Web Extension
                                                  validation

  Firefox Android         Exploratory             Device-specific tests

  Safari iOS/iPadOS       Exploratory             App/extension packaging
                                                  and device tests

  Chrome Android          Not a standard          Explain limitation
                          extension target        
  -----------------------------------------------------------------------

### 13.3 Functional tests

-   Install, enable, disable, and uninstall.
-   Popup state reflects the current tab.
-   Current-site setting persists.
-   Preset changes apply and revert.
-   Reset removes injected styling.
-   Navigation and SPA route changes work.
-   Dynamic content is handled without runaway observers.
-   Forms, inputs, buttons, links, and menus remain usable.
-   Exclusions work.
-   Storage migrations work.
-   Invalid settings recover safely.
-   Restricted pages fail gracefully.

### 13.4 Image tests

-   Same-origin image.
-   Cross-origin image with CORS.
-   Cross-origin image without CORS.
-   Lazy-loaded image.
-   Responsive `srcset`.
-   CSS background image.
-   SVG.
-   Animated image.
-   Very large image.
-   Broken image URL.
-   Image removed while processing.
-   Page navigation during processing.

### 13.5 Accessibility tests

-   Keyboard-only navigation.
-   Visible focus.
-   Screen reader smoke test.
-   Contrast checks.
-   200% zoom.
-   Reduced motion.
-   RTL and Bengali text rendering.
-   No controls obscured by decorative effects.
-   Readability of dense tables and form labels.

Use automated accessibility tools as a supplement, not a replacement for
manual testing.

### 13.6 Acceptance criteria

A milestone is complete only when: 1. Its stated behavior is
implemented. 2. Relevant automated tests pass. 3. Manual test steps are
recorded. 4. No known critical regression remains. 5. Accessibility
implications are reviewed. 6. Performance and privacy implications are
reviewed. 7. Documentation is updated. 8. The feature can be disabled or
safely recovered from.

------------------------------------------------------------------------

## 14. Development roadmap and milestone gates

Build in small, reviewable milestones. Do not ask Claude to implement
the entire product in one large step.

### Milestone 0 --- Discovery and technical spike

Deliverables: - Confirm current browser extension API constraints. -
Select and verify build tooling. - Create a minimal extension that loads
locally. - Inject and remove one namespaced CSS class. - Test a basic
page and a dynamic page. - Record known platform constraints.

Gate: the extension loads, activates, deactivates, and leaves the page
usable.

### Milestone 1 --- Extension shell and popup

Deliverables: - Manifest and build setup. - Background/service worker. -
Content script. - Popup UI. - Typed messaging. - Settings persistence. -
Basic error states.

Gate: enable/disable and current-site settings work reliably.

### Milestone 2 --- Theme engine

Deliverables: - Token system. - Classic Cartoon preset. - At least two
additional preset configurations. - Safe common-element styling. - Reset
and exclusion logic. - Dynamic DOM handling.

Gate: test across the website categories listed above without breaking
core interactions.

### Milestone 3 --- Presets and visual effects

Deliverables: - Preset selector and previews. - Intensity control. -
Star Trail effect. - One subtle background effect. - Motion and touch
safeguards. - Reduced-motion behavior.

Gate: effects do not obscure content or controls and can be disabled
independently.

### Milestone 4 --- Typography

Deliverables: - Script-aware font stacks. - Bengali, Latin, Arabic, and
CJK test coverage. - Readability mode. - Font license records. -
Typography toggle.

Gate: no missing glyphs or shaping regressions in the supported test
set.

### Milestone 5 --- Local image processing

Deliverables: - Image eligibility checks. - Local cartoon-like filter
pipeline. - Visibility-based processing. - Bounded cache. - Cancellation
and cleanup. - Fallback behavior.

Gate: no page breakage, unbounded processing, or CORS security bypass.

### Milestone 6 --- Optional AI enhancement research

Deliverables: - Provider/model comparison. - Cost and latency
assessment. - Privacy and data-flow design. - Consent UX. - Backend
architecture if needed. - Prototype on user-selected images only.

Gate: do not ship until consent, security, cost, retention, and failure
behavior are documented.

### Milestone 7 --- Cross-browser hardening

Deliverables: - Browser compatibility adapter. - Firefox build. - Safari
packaging investigation. - Platform support matrix. - Browser-specific
regression tests.

Gate: only claim support for platforms that have been tested.

### Milestone 8 --- Release readiness

Deliverables: - README and setup instructions. - Screenshots and demo. -
Privacy policy. - Permissions explanation. - License notices. - Store
assets. - Versioning and release workflow. - Final regression report.

Gate: all store declarations accurately describe the shipped product.

------------------------------------------------------------------------

## 15. Git and release workflow

Use small, understandable commits.

Suggested branch model: - `main`: stable release-ready code. -
`develop`: integration branch if the project needs one. -
`feature/<short-name>`: individual feature work. - `fix/<short-name>`:
bug fixes.

Suggested commit style: - `feat: add current-site activation` -
`feat: add classic cartoon preset` -
`fix: prevent duplicate mutation observers` -
`test: cover cross-origin image fallback` -
`docs: update browser compatibility matrix`

Before each commit: 1. Run type checking. 2. Run linting. 3. Run unit
tests. 4. Run relevant integration/e2e tests. 5. Review the diff. 6.
Confirm no secrets, private data, generated build files, or unrelated
changes are included.

Use a `.gitignore` for dependencies, build output, local environment
files, test artifacts, and editor-specific temporary files.

Never commit API keys, tokens, private certificates, or personal test
data.

------------------------------------------------------------------------

## 16. Claude + VS Code working instructions

Create a `CLAUDE.md` in the repository root. Use the following rules as
the persistent project instructions.

### 16.1 Role

You are the senior browser-extension engineer and technical mentor
helping build Toonify Web. The project owner is a UX designer who is
learning implementation through practical work. Explain important
decisions clearly, but do not oversimplify engineering risks.

### 16.2 Working style

-   Work one milestone at a time.
-   Do not rush to implement the whole roadmap.
-   Before coding, inspect the existing repository and identify what
    already exists.
-   Explain the purpose of the current task and the files that will
    change.
-   Prefer simple, maintainable solutions.
-   Use TypeScript strict mode.
-   Avoid `any`; if unavoidable, explain and isolate it.
-   Do not add dependencies without explaining why they are needed.
-   Do not invent APIs or assume browser support.
-   Check current official browser documentation when an API or store
    policy may have changed.
-   Distinguish confirmed behavior from assumptions.
-   Ask a focused question when a decision materially affects
    architecture or privacy.
-   If a task is too large, break it into smaller steps and stop at a
    useful checkpoint.

### 16.3 Before implementing a feature

1.  Restate the requirement.
2.  Identify user value.
3.  Identify technical constraints and edge cases.
4.  Identify accessibility requirements.
5.  Identify privacy and performance risks.
6.  Propose the smallest safe implementation.
7.  List files expected to change.
8.  Define how the feature will be tested.
9.  Wait for approval for major architectural changes or costly external
    services.

### 16.4 During implementation

-   Implement only the approved scope.
-   Keep components small and responsibilities clear.
-   Reuse shared types and tokens.
-   Keep browser-specific APIs behind adapters.
-   Avoid global CSS that could damage host pages.
-   Namespace injected styles.
-   Keep transformation reversible.
-   Handle asynchronous work and cleanup correctly.
-   Avoid duplicate observers, event listeners, and message handlers.
-   Handle errors without breaking the original website.
-   Do not silently add telemetry or network requests.
-   Do not upload images or page data without explicit approval.

### 16.5 After implementation

Always: 1. Run TypeScript checks. 2. Run linting. 3. Run relevant unit
tests. 4. Run relevant browser tests where available. 5. Report exactly
what passed and what did not run. 6. Explain manual testing steps. 7.
List known limitations. 8. Review accessibility and performance. 9.
Update documentation. 10. Suggest the next smallest logical task.

Never claim that something was tested if it was not actually executed.

### 16.6 Debugging protocol

When something fails: 1. Reproduce the issue. 2. Identify the affected
browser, site type, and steps. 3. Inspect the console and extension
logs. 4. Find the smallest root cause. 5. Make a focused fix. 6. Add a
regression test. 7. Retest the original scenario and adjacent scenarios.

Do not rewrite large sections of working code to fix a small bug.

### 16.7 Code quality rules

-   Use semantic HTML in extension UI.
-   Use accessible labels and keyboard behavior.
-   Use explicit types for messages and stored settings.
-   Validate data at runtime.
-   Avoid unsafe HTML injection.
-   Avoid `eval` and remotely hosted executable code.
-   Keep secrets out of client code.
-   Clean up observers, listeners, canvases, and object URLs.
-   Avoid unnecessary DOM reads/writes that cause layout thrashing.
-   Document non-obvious browser workarounds.

### 16.8 Learning protocol

When introducing an unfamiliar concept: - Explain what it does. -
Explain why it is needed here. - Show where it lives in the project. -
Give a small practical example. - Let the project owner try a small
change when useful. - Do not dump a large tutorial unrelated to the
current milestone.

### 16.9 Definition of done

A feature is not done because code was generated. It is done only
when: - The behavior matches the requirement. - It has been tested at
the appropriate level. - Failure and fallback states are handled. -
Accessibility has been considered. - Privacy and performance have been
considered. - It is reversible where applicable. - Documentation is
current. - The owner understands how to run and verify it.

------------------------------------------------------------------------

## 17. First implementation task for Claude

Do not start with AI image generation or complex cartoon filters.

Start with **Milestone 0: Discovery and technical spike**.

Ask Claude to: 1. Inspect the repository and current development
environment. 2. Check current official documentation for Manifest V3 and
relevant browser APIs. 3. Recommend a maintained Vite-based extension
setup. 4. Explain the trade-offs of the chosen tooling. 5. Create the
smallest runnable extension. 6. Add a popup with one enable/disable
control. 7. Inject a namespaced visual treatment into a normal test
page. 8. Remove the treatment cleanly when disabled. 9. Test on at least
two different page structures. 10. Report exact test results and
limitations.

Do not proceed to the full theme engine until this foundation works.

------------------------------------------------------------------------

## 18. Initial product decisions

These decisions are established for the first version:

-   **Primary visual direction:** Classic Cartoon.
-   **Image strategy:** Hybrid---local processing first, optional AI
    enhancement later.
-   **Typography:** Offer playful font choices while preserving the
    original language and script.
-   **Compatibility ambition:** All major browsers and devices where
    extension support allows; validate separately.
-   **Special effects:** Optional Star Trail, subtle animated
    backgrounds, sparkles, floating doodles, and other decorative
    effects.
-   **User control:** Presets and effects must be independently
    adjustable and reversible.
-   **Accessibility:** Target WCAG 2.2 AA for the extension UI, with
    safeguards for transformed pages.
-   **Privacy:** Local-first by default; explicit consent for any remote
    AI processing.

------------------------------------------------------------------------

## 19. Open questions to resolve during discovery

Do not block the first technical spike on these questions. Resolve them
before the relevant milestone.

1.  Final product name and brand identity.
2.  Exact preset list for the first public release.
3.  Whether users can create and save custom presets.
4.  Whether AI enhancement will use a hosted provider, an on-device
    model, or remain an experimental optional feature.
5.  Whether image processing should happen automatically or only when
    the user chooses an image.
6.  Which browsers will be included in the first public beta.
7.  Whether any paid features or usage limits will exist.
8.  Which fonts can be legally bundled and redistributed.

------------------------------------------------------------------------

## 20. Success criteria

The project is successful when a new user can:

-   Install the extension on a supported browser.
-   Understand what it does and what it cannot do.
-   Activate a cartoon preset on a supported website.
-   Recognize the original website and continue using its core
    functions.
-   Adjust the visual intensity and optional effects.
-   Keep text readable in supported languages.
-   Disable motion and decorative effects.
-   Revert the page to its original appearance.
-   Understand when image processing is local versus remote.
-   Use the extension without unexpected data uploads.

The engineering team must also be able to demonstrate: - A repeatable
test suite. - A documented browser support matrix. - No known critical
security or accessibility issue at release. - Measured performance on
representative pages and devices. - A transparent privacy policy and
accurate store permission declarations.

------------------------------------------------------------------------

## Final product principle

**Toonify Web should make the web more delightful, not less usable.**

A beautiful transformation that breaks a checkout flow, hides a focus
indicator, distorts Bengali text, slows down a dashboard, or uploads an
image without clear consent is a failed transformation.

Prioritize functionality, readability, accessibility, privacy, and
performance. Add visual delight on top of that foundation.
