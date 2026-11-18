import type { InkShadow, MediaTreatment, ThemeTokens } from '@/core/themes';
import { MARK } from './classify';
import { CARTOON_FILTER_ID } from './image-filter';
import { ACTIVE_ATTRIBUTE, SCHEME_ATTRIBUTE } from './toonify-layer';

/**
 * Turns a theme into CSS. Safety rules every theme gets for free:
 * - Rules apply only under html[data-toonify-active] and only to elements
 *   the classifier marked.
 * - Only visual properties: no display, position, size, margin, padding,
 *   z-index or overflow, so layouts and click targets never move.
 * - Lines are drawn with box-shadow / outline, which take no layout space.
 * - Controls keep the site's own focus ring: our shadows switch off while a
 *   control has keyboard focus (:focus-visible).
 * - No !important, so a site's more specific rules still win.
 *
 * Ink lives in custom properties on <html> (--toonify-ink, --toonify-ink-soft,
 * --toonify-frame). With `currentColor` they resolve per element, so lines
 * follow each element's text colour. A theme's fixed ink (sepia, black...)
 * is replaced by the text colour on dark pages, so lines stay visible.
 */

/** CSS filter list for photos (only the parts a theme changes). */
export function mediaFilter(media: MediaTreatment): string {
  const parts = [
    `saturate(${media.saturate})`,
    `contrast(${media.contrast})`,
    `sepia(${media.sepia})`,
  ];
  if (media.grayscale) parts.push(`grayscale(${media.grayscale})`);
  if (media.brightness !== undefined && media.brightness !== 1)
    parts.push(`brightness(${media.brightness})`);
  if (media.hueRotate) parts.push(`hue-rotate(${media.hueRotate}deg)`);
  return parts.join(' ');
}

const mix = (colour: string, percent: number) =>
  `color-mix(in srgb, ${colour} ${Math.round(percent)}%, transparent)`;

/**
 * @param inkOnly Only the ink custom properties (style "Original": the site
 *   keeps its look, but effects such as Hand-drawn lines still need ink).
 */
export function buildThemeCss(theme: ThemeTokens, inkOnly = false): string {
  const root = `html[${ACTIVE_ATTRIBUTE}]`;
  const dark = `html[${ACTIVE_ATTRIBUTE}][${SCHEME_ATTRIBUTE}="dark"]`;
  const base = theme.ink ?? 'currentColor';
  const { line, radius, media } = theme;

  // Hard shadows are solid ink; blurred ones are a lighter, softer ink.
  const shadow = (s: InkShadow | null, spread = 0) => {
    if (s === null) return '';
    const colour = s.blur === 0 ? 'var(--toonify-ink)' : 'var(--toonify-ink-soft)';
    return `, ${s.x}px ${s.y}px ${s.blur}px ${s.blur === 0 ? spread : 0}px ${colour}`;
  };
  const mediaShadow = shadow(theme.mediaShadow).replace(/^, /, '');
  // The redraw (SVG filter) runs first, then the colour treatment.
  const redraw = theme.cartoon === null ? '' : `url(#${CARTOON_FILTER_ID}) `;

  const ink = `
${root} {
  --toonify-ink: ${mix(base, theme.inkStrength)};
  --toonify-ink-soft: ${mix(base, theme.inkStrength / 2)};
  --toonify-frame: ${theme.frame ?? 'var(--toonify-ink)'};
}
${dark} {
  --toonify-ink: ${mix('currentColor', theme.inkStrength)};
  --toonify-ink-soft: ${mix('currentColor', theme.inkStrength / 2)};
}
`;
  if (inkOnly) return ink;
  return `${ink}${root} [${MARK}="media"] {
  border-radius: ${radius.media}px;
  outline: ${line.media}px solid var(--toonify-frame);
  outline-offset: -${line.media}px;
  filter: ${redraw}${mediaFilter(media)};${mediaShadow ? `\n  box-shadow: ${mediaShadow};` : ''}
}
${root} [${MARK}="button"] {
  border-radius: ${radius.button}px;
}
${root} [${MARK}="button"]:not(:focus-visible) {
  box-shadow: 0 0 0 ${line.button}px var(--toonify-ink)${shadow(theme.buttonShadow, line.button)};
}
${root} [${MARK}="field"] {
  border-radius: ${radius.field}px;
}
${root} [${MARK}="field"]:not(:focus-visible) {
  box-shadow: 0 0 0 ${line.field}px var(--toonify-ink);
}
`;
}
