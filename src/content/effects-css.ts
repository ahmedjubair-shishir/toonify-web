import type { Effects } from '@/core/effects';
import type { InkShadow, ThemeTokens } from '@/core/themes';
import { MARK } from './classify';
import { SKETCH_FILTER_ID } from './image-filter';
import { ACTIVE_ATTRIBUTE, SCHEME_ATTRIBUTE } from './toonify-layer';

/**
 * CSS for the optional effects (popup > Effects). Same safety rules as the
 * theme CSS: only marked elements, no !important, focus rings kept. Two
 * deliberate, documented exceptions, both purely visual:
 * - Sticker photos and Bouncy buttons use `transform` (tilt / bounce). It
 *   does not move other content; motion is skipped for reduced motion.
 * - Comic background draws one fixed, click-through overlay (html::after).
 * Ink follows the page: dark ink on light pages, light ink on dark pages
 * (html[data-toonify-scheme], set by the content script).
 */

export interface FontUrls {
  latin: string;
  latinExt: string;
}

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const DARK_INK = '#1b1b2f';
const LIGHT_INK = '#f3f1ff';

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** A rough, double-stroked rectangle that stretches to any button or field. */
function sketchBox(ink: string): string {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">` +
      `<g fill="none" stroke="${ink}" stroke-linecap="round" vector-effect="non-scaling-stroke">` +
      `<path vector-effect="non-scaling-stroke" stroke-width="1.6" d="M1.5 5C30 1 70 3 98.5 2C99.5 30 97.5 70 98.5 97C70 99.5 30 97.5 2 98.5C0.5 70 2.5 30 1.5 5Z"/>` +
      `<path vector-effect="non-scaling-stroke" stroke-width="1" stroke-opacity="0.55" d="M3 1.5C36 3 64 0.5 97 3C96 36 99.5 64 97 99C64 97.5 36 99.5 1 97C3.5 64 0.5 36 3 1.5"/>` +
      `</g></svg>`,
  );
}

function paperNoise(rgb: string, alpha: number): string {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">` +
      `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>` +
      `<feColorMatrix values="0 0 0 0 ${rgb}  0 0 0 0 ${rgb}  0 0 0 0 ${rgb}  0 0 0 ${alpha} 0"/></filter>` +
      `<rect width="100%" height="100%" filter="url(#n)"/></svg>`,
  );
}

function texture(kind: ThemeTokens['texture'], dark: boolean): string {
  const line = dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(27, 27, 47, 0.07)';
  const dot = dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(27, 27, 47, 0.16)';
  if (kind === 'halftone') {
    return `background-image: radial-gradient(${dot} 1.2px, transparent 1.6px); background-size: 7px 7px;`;
  }
  if (kind === 'paper') {
    return `background-image: ${dark ? paperNoise('0.9', 0.18) : paperNoise('0.35', 0.22)}; background-size: 180px 180px;`;
  }
  return `background-image: linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px); background-size: 18px 18px;`;
}

const liftOnly = (shadow: InkShadow | null, ink: string) =>
  shadow === null ? 'none' : `${shadow.x}px ${shadow.y}px ${shadow.blur}px 0 ${ink}`;

export function buildEffectsCss(theme: ThemeTokens, effects: Effects, fonts: FontUrls): string {
  const root = `html[${ACTIVE_ATTRIBUTE}]`;
  const dark = `html[${ACTIVE_ATTRIBUTE}][${SCHEME_ATTRIBUTE}="dark"]`;
  const ink = `color-mix(in srgb, currentColor ${theme.inkStrength}%, transparent)`;
  const media = `[${MARK}="media"]`;
  const button = `[${MARK}="button"]`;
  const field = `[${MARK}="field"]`;
  const parts: string[] = [];

  if (effects.sketch) {
    const imageColour = `saturate(${theme.media.saturate}) contrast(${theme.media.contrast}) sepia(${theme.media.sepia})`;
    parts.push(`
${root} ${button}, ${root} ${field} {
  background-image: ${sketchBox(DARK_INK)};
  background-repeat: no-repeat;
  background-size: 100% 100%;
  background-position: center;
}
${dark} ${button}, ${dark} ${field} {
  background-image: ${sketchBox(LIGHT_INK)};
}
${root} ${button}:not(:focus-visible) {
  box-shadow: ${liftOnly(theme.buttonShadow, ink)};
}
${root} ${field}:not(:focus-visible) {
  box-shadow: none;
}
${root} ${media} {
  filter: url(#${SKETCH_FILTER_ID}) ${imageColour};
}
${root} :is(p, li, dd, blockquote, td, figcaption) a:not([${MARK}]) {
  text-decoration-line: underline;
  text-decoration-style: wavy;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: color-mix(in srgb, currentColor 65%, transparent);
}`);
  }

  if (effects.sticker) {
    parts.push(`
${root} ${media} {
  box-shadow: 0 0 0 5px #ffffff, 0 0 0 6px rgba(27, 27, 47, 0.14), 4px 8px 16px rgba(27, 27, 47, 0.28);
  transform: rotate(var(--toonify-tilt, -1.2deg));
}
${root} ${media}:nth-of-type(even) {
  --toonify-tilt: 1.2deg;
}
${root} ${media}:hover {
  transform: rotate(0deg) scale(1.02);
}
@media (prefers-reduced-motion: no-preference) {
  ${root} ${media} {
    transition: transform 0.25s ease;
  }
}`);
  }

  if (effects.bouncy) {
    parts.push(`
@media (prefers-reduced-motion: no-preference) {
  ${root} ${button} {
    transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  ${root} ${button}:hover {
    transform: translateY(-2px) rotate(-1.5deg) scale(1.04);
  }
  ${root} ${button}:active {
    transform: translateY(1px) scale(0.94);
    transition-duration: 0.08s;
  }
}`);
  }

  if (effects.headings) {
    parts.push(`
@font-face {
  font-family: "Toonify Fredoka";
  src: url("${fonts.latin}") format("woff2");
  font-weight: 300 700;
  font-display: swap;
  unicode-range: ${LATIN};
}
@font-face {
  font-family: "Toonify Fredoka";
  src: url("${fonts.latinExt}") format("woff2");
  font-weight: 300 700;
  font-display: swap;
  unicode-range: ${LATIN_EXT};
}
${root} [${MARK}="heading"] {
  font-family: "Toonify Fredoka", ui-rounded, system-ui, sans-serif;
  letter-spacing: 0.01em;
}`);
  }

  if (effects.texture) {
    parts.push(`
${root}::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  mix-blend-mode: multiply;
  ${texture(theme.texture, false)}
}
${dark}::after {
  mix-blend-mode: screen;
  ${texture(theme.texture, true)}
}`);
  }

  return parts.join('\n');
}
