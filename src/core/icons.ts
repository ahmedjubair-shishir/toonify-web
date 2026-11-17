/**
 * Icon swap (popup > Icons). Toonify finds the icons on a page, works out
 * what each one means (search, menu, close...) and can redraw it from a
 * free icon set, in a chosen look. Default: original icons, plain look.
 */
import { ICON_MEANINGS, ICON_SVGS, type IconMeaning } from './icon-sets.data';

export { ICON_MEANINGS, ICON_SVGS, type IconMeaning };

export const ICON_SET_IDS = ['original', 'lucide', 'phosphor', 'tabler'] as const;
export type IconSetId = (typeof ICON_SET_IDS)[number];
/** Sets that hold drawings (everything except "keep the site's own icons"). */
export type DrawnIconSetId = Exclude<IconSetId, 'original'>;

export const ICON_LOOK_IDS = ['plain', 'cartoon', 'sketch', 'animated'] as const;
export type IconLookId = (typeof ICON_LOOK_IDS)[number];

export interface IconOption<Id extends string> {
  id: Id;
  name: string;
  description: string;
}

export const ICON_SETS: readonly IconOption<IconSetId>[] = [
  { id: 'original', name: 'Original', description: "Keep the site's own icons" },
  { id: 'lucide', name: 'Lucide', description: 'Clean, even outlines' },
  { id: 'phosphor', name: 'Phosphor', description: 'Soft, friendly shapes' },
  { id: 'tabler', name: 'Tabler', description: 'Crisp, rounded outlines' },
];

export const ICON_LOOKS: readonly IconOption<IconLookId>[] = [
  { id: 'plain', name: 'Plain', description: 'Icons as they are' },
  { id: 'cartoon', name: 'Cartoon', description: 'Bold lines with a cartoon drop shadow' },
  { id: 'sketch', name: 'Sketched', description: 'Wobbly, hand-drawn lines' },
  { id: 'animated', name: 'Animated', description: 'Icons wiggle when you point at them' },
];

export const DEFAULT_ICON_SET: IconSetId = 'original';
export const DEFAULT_ICON_LOOK: IconLookId = 'plain';

export const isIconSetId = (value: unknown): value is IconSetId =>
  typeof value === 'string' && (ICON_SET_IDS as readonly string[]).includes(value);
export const isIconLookId = (value: unknown): value is IconLookId =>
  typeof value === 'string' && (ICON_LOOK_IDS as readonly string[]).includes(value);

export interface IconChoice {
  set: IconSetId;
  look: IconLookId;
}

export const resolveIcons = (set: unknown, look: unknown): IconChoice => ({
  set: isIconSetId(set) ? set : DEFAULT_ICON_SET,
  look: isIconLookId(look) ? look : DEFAULT_ICON_LOOK,
});

/** Does this choice change anything? (Icons are only found when it does.) */
export const iconsActive = (choice: IconChoice) =>
  choice.set !== DEFAULT_ICON_SET || choice.look !== DEFAULT_ICON_LOOK;

/**
 * One icon as SVG markup, drawn in a look. The look is drawn inside the icon
 * itself, because the page shows the icon as a CSS mask (so it takes the
 * text colour), and a mask would cut off any outside filter or shadow.
 * - cartoon: thicker lines plus a faded copy offset down-right (drop shadow)
 * - sketch:  lines nudged by fixed noise, so they look drawn by hand
 * Black on transparent: only the shape (alpha) matters to a mask.
 */
export function iconSvg(set: DrawnIconSetId, meaning: IconMeaning, look: IconLookId): string {
  const svg = ICON_SVGS[set][meaning];
  if (look !== 'cartoon' && look !== 'sketch') return svg;
  const match = /^<svg ([^>]*)>([\s\S]*)<\/svg>$/.exec(svg);
  if (!match) return svg;
  let attributes = match[1] ?? '';
  const inner = match[2] ?? '';
  const size = Number(/viewBox="0 0 (\d+)/.exec(attributes)?.[1] ?? 24);
  const unit = size / 24; // 1 for Lucide / Tabler, ~10.7 for Phosphor
  const n = (value: number) => +value.toFixed(2);

  if (look === 'sketch') {
    const filter =
      `<filter id="w" x="-10%" y="-10%" width="120%" height="120%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${n(0.3 / unit)}" numOctaves="1" seed="3"/>` +
      `<feDisplacementMap in="SourceGraphic" scale="${n(2.6 * unit)}" xChannelSelector="R" yChannelSelector="G"/>` +
      `</filter>`;
    return `<svg ${attributes}><defs>${filter}</defs><g filter="url(#w)">${inner}</g></svg>`;
  }

  // cartoon
  attributes = attributes.includes('stroke-width="2"')
    ? attributes.replace('stroke-width="2"', 'stroke-width="2.6"')
    : `${attributes} stroke="#000" stroke-width="${n(0.6 * unit)}" stroke-linejoin="round"`;
  const offset = n(1.6 * unit);
  attributes = attributes.replace(
    /viewBox="[^"]*"/,
    `viewBox="${n(-unit)} ${n(-unit)} ${n(size + 3 * unit)} ${n(size + 3 * unit)}"`,
  );
  return `<svg ${attributes}><g opacity=".35" transform="translate(${offset} ${offset})">${inner}</g><g>${inner}</g></svg>`;
}

/** Mask-ready data URL for one icon of a set, in a look (popup previews, tests). */
export const iconDataUrl = (
  set: DrawnIconSetId,
  meaning: IconMeaning,
  look: IconLookId = 'plain',
) => `data:image/svg+xml,${encodeURIComponent(iconSvg(set, meaning, look))}`;

/** Looks that change the drawing itself ("animated" moves the plain drawing). */
const drawnLook = (look: IconLookId) => (look === 'cartoon' || look === 'sketch' ? look : 'plain');

/**
 * Where an icon file lives inside the extension. Pages load icons from the
 * extension, not from data: URLs: a strict site security policy (img-src
 * 'self') blocks data: images, and the icon would vanish (tested).
 */
export const iconFilePath = (set: DrawnIconSetId, meaning: IconMeaning, look: IconLookId) =>
  `icons/${set}/${drawnLook(look)}/${meaning}.svg`;

/** Every icon file the build writes (wxt.config.ts, build:publicAssets hook). */
export function iconPublicFiles(): { relativeDest: string; contents: string }[] {
  const files: { relativeDest: string; contents: string }[] = [];
  for (const set of ICON_SET_IDS) {
    if (set === 'original') continue;
    for (const look of ['plain', 'cartoon', 'sketch'] as const) {
      for (const meaning of ICON_MEANINGS) {
        files.push({
          relativeDest: iconFilePath(set, meaning, look),
          contents: iconSvg(set, meaning, look),
        });
      }
    }
  }
  return files;
}
