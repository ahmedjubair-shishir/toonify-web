import type { InkShadow, ThemeTokens } from '@/core/themes';
import { MARK } from './classify';
import { CARTOON_FILTER_ID } from './image-filter';
import { ACTIVE_ATTRIBUTE } from './toonify-layer';

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
 */
export function buildThemeCss(theme: ThemeTokens): string {
  const root = `html[${ACTIVE_ATTRIBUTE}]`;
  const ink = `color-mix(in srgb, currentColor ${theme.inkStrength}%, transparent)`;
  const { line, radius, media } = theme;

  // Hard shadows are solid ink; blurred ones are a lighter, softer ink.
  const shadow = (s: InkShadow | null, spread = 0) => {
    if (s === null) return '';
    const colour =
      s.blur === 0
        ? ink
        : `color-mix(in srgb, currentColor ${Math.round(theme.inkStrength / 2)}%, transparent)`;
    return `, ${s.x}px ${s.y}px ${s.blur}px ${s.blur === 0 ? spread : 0}px ${colour}`;
  };
  const mediaShadow = shadow(theme.mediaShadow).replace(/^, /, '');
  // The redraw (SVG filter) runs first, then the colour treatment.
  const redraw = theme.cartoon === null ? '' : `url(#${CARTOON_FILTER_ID}) `;

  return `
${root} [${MARK}="media"] {
  border-radius: ${radius.media}px;
  outline: ${line.media}px solid ${ink};
  outline-offset: -${line.media}px;
  filter: ${redraw}saturate(${media.saturate}) contrast(${media.contrast}) sepia(${media.sepia});${
    mediaShadow ? `\n  box-shadow: ${mediaShadow};` : ''
  }
}
${root} [${MARK}="button"] {
  border-radius: ${radius.button}px;
}
${root} [${MARK}="button"]:not(:focus-visible) {
  box-shadow: 0 0 0 ${line.button}px ${ink}${shadow(theme.buttonShadow, line.button)};
}
${root} [${MARK}="field"] {
  border-radius: ${radius.field}px;
}
${root} [${MARK}="field"]:not(:focus-visible) {
  box-shadow: 0 0 0 ${line.field}px ${ink};
}
`;
}
