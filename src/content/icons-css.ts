import {
  ICON_MEANINGS,
  iconFilePath,
  iconsActive,
  type DrawnIconSetId,
  type IconChoice,
  type IconLookId,
  type IconMeaning,
} from '@/core/icons';
import { ICON_MARK } from './icon-meaning';
import { ICON_SKETCH_FILTER_ID } from './image-filter';
import { ACTIVE_ATTRIBUTE } from './toonify-layer';

/**
 * CSS for the icon feature. Same safety rules as the theme CSS: only marked
 * elements, only under html[data-toonify-active], no layout properties, no
 * !important. Exception: the "Animated" look moves icons with the separate
 * `rotate` / `scale` properties (they add to the site's own transform, so a
 * flipped chevron stays flipped), only when reduced motion is not requested.
 *
 * Swapping an icon draws the new one as a CSS mask filled with the text
 * colour, so it fits light and dark sites, and hides the old drawing:
 * - svg:          its shapes are made invisible (visibility stays undone on off)
 * - font icons:   the glyph's text is made transparent
 * - small images: the picture is pushed out of its own box (object-position)
 * Icons whose meaning is unknown ("other") keep their drawing; looks still apply.
 */
/** Full URL of an icon file (the content script passes browser.runtime.getURL). */
export type IconUrl = (path: string) => string;

export function buildIconsCss(choice: IconChoice, iconUrl: IconUrl): string {
  if (!iconsActive(choice)) return '';
  const root = `html[${ACTIVE_ATTRIBUTE}]`;
  const icon = `[${ICON_MARK}]`;
  const known = `[${ICON_MARK}]:not([${ICON_MARK}="other"])`;
  const parts: string[] = [];
  const swapping = choice.set !== 'original';

  if (choice.set !== 'original') {
    const set = choice.set;
    // One custom property per meaning; the drawing rules below are shared.
    for (const meaning of ICON_MEANINGS) {
      parts.push(
        `${root} [${ICON_MARK}="${meaning}"] { --toonify-icon: url("${fileUrl(iconUrl, set, meaning, choice.look)}"); }`,
      );
    }
    parts.push(`
${root} ${known} {
  background: currentColor;
  -webkit-mask: var(--toonify-icon) center / contain no-repeat;
  mask: var(--toonify-icon) center / contain no-repeat;
}
${root} svg${known} > * {
  visibility: hidden;
}
${root} :is(i, span)${known},
${root} :is(i, span)${known}::before,
${root} :is(i, span)${known}::after {
  -webkit-text-fill-color: transparent;
}
${root} img${known} {
  object-position: -99999px 0;
}`);
  }

  // Looks for icons that keep their own drawing (all icons, or unknown ones).
  const own = swapping ? `[${ICON_MARK}="other"]` : icon;
  if (choice.look === 'cartoon') {
    parts.push(`
${root} ${own} {
  filter: drop-shadow(0 0 0.4px currentColor) drop-shadow(1.5px 1.5px 0 color-mix(in srgb, currentColor 35%, transparent));
}`);
  } else if (choice.look === 'sketch') {
    parts.push(`
${root} ${own} {
  filter: url(#${ICON_SKETCH_FILTER_ID});
}`);
  } else if (choice.look === 'animated') {
    parts.push(`
@keyframes toonify-icon-wiggle {
  0%, 100% { rotate: 0deg; scale: 1; }
  25% { rotate: -12deg; scale: 1.15; }
  50% { rotate: 10deg; scale: 1.15; }
  75% { rotate: -6deg; scale: 1.08; }
}
@keyframes toonify-icon-pop {
  0% { scale: 0.6; }
  60% { scale: 1.15; }
  100% { scale: 1; }
}
@media (prefers-reduced-motion: no-preference) {
  ${root} ${icon} {
    animation: toonify-icon-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  ${root} ${icon}:hover,
  ${root} :is(a, button, [role="button"], label):is(:hover, :focus-visible) ${icon} {
    animation: toonify-icon-wiggle 0.6s ease-in-out;
  }
}`);
  }
  return parts.join('\n');
}

const fileUrl = (iconUrl: IconUrl, set: DrawnIconSetId, meaning: IconMeaning, look: IconLookId) =>
  iconUrl(`/${iconFilePath(set, meaning, look)}`).replace(/["\\\n]/g, '');

/** Does the page need the icon sketch filter element? */
export const needsIconSketch = (choice: IconChoice) =>
  choice.look === 'sketch' && iconsActive(choice);
