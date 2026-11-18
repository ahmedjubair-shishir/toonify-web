/**
 * Icon swap (popup > Icons). Toonify finds the icons on a page, works out
 * what each one means (search, menu, close...) and can redraw it from a
 * free icon set, in a chosen look. Default: original icons, plain look.
 */
import { ICON_MEANINGS, ICON_SVGS, type IconMeaning } from './icon-sets.data';

export { ICON_MEANINGS, ICON_SVGS, type IconMeaning };

export const ICON_SET_IDS = ['original', 'lucide', 'phosphor', 'tabler'] as const;
export type BuiltInIconSetId = (typeof ICON_SET_IDS)[number];
/** A set the user added from a link (see custom-icons.ts): "custom:<id>". */
export type CustomIconSetRef = `custom:${string}`;
export type IconSetId = BuiltInIconSetId | CustomIconSetRef;
/** Built-in sets that hold drawings (everything except "keep the site's own icons"). */
export type DrawnIconSetId = Exclude<BuiltInIconSetId, 'original'>;

export const CUSTOM_SET_PREFIX = 'custom:';
const CUSTOM_REF = /^custom:[a-z0-9-]{1,40}$/;
export const isCustomSetRef = (value: unknown): value is CustomIconSetRef =>
  typeof value === 'string' && CUSTOM_REF.test(value);
export const customSetRef = (id: string): CustomIconSetRef => `custom:${id}`;
export const customSetIdOf = (ref: CustomIconSetRef) => ref.slice(CUSTOM_SET_PREFIX.length);
export const isDrawnSet = (set: IconSetId): set is DrawnIconSetId =>
  set !== 'original' && !isCustomSetRef(set);

export const ICON_LOOK_IDS = ['plain', 'cartoon', 'sketch', 'animated'] as const;
export type IconLookId = (typeof ICON_LOOK_IDS)[number];

export interface IconOption<Id extends string> {
  id: Id;
  name: string;
  description: string;
}

export const ICON_SETS: readonly IconOption<BuiltInIconSetId>[] = [
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
  (typeof value === 'string' && (ICON_SET_IDS as readonly string[]).includes(value)) ||
  isCustomSetRef(value);
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
 * Draws any icon SVG in a look. The look is drawn inside the icon itself,
 * because the page shows the icon as a CSS mask (so it takes the text
 * colour), and a mask would cut off any outside filter or shadow.
 * - cartoon: thicker lines plus a faded copy offset down-right (drop shadow)
 * - sketch:  lines nudged by fixed noise, so they look drawn by hand
 * Only the shape (alpha) matters to a mask, so colours are irrelevant.
 */
export function styleIconSvg(svg: string, look: IconLookId): string {
  if (look !== 'cartoon' && look !== 'sketch') return svg;
  const match = /^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(svg.trim());
  if (!match) return svg;
  let attributes = match[1] ?? '';
  const inner = match[2] ?? '';
  const box = /viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(
    attributes,
  );
  const [x, y, width, height] = box ? box.slice(1, 5).map(Number) : [0, 0, 24, 24];
  const size = Math.max(width ?? 24, height ?? 24) || 24;
  const unit = size / 24; // 1 for 24px sets, ~10.7 for Phosphor's 256
  const n = (value: number) => +value.toFixed(2);

  if (look === 'sketch') {
    const filter =
      `<filter id="w" x="-10%" y="-10%" width="120%" height="120%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${n(0.3 / unit)}" numOctaves="1" seed="3"/>` +
      `<feDisplacementMap in="SourceGraphic" scale="${n(2.6 * unit)}" xChannelSelector="R" yChannelSelector="G"/>` +
      `</filter>`;
    return `<svg${attributes}><defs>${filter}</defs><g filter="url(#w)">${inner}</g></svg>`;
  }

  // cartoon: thicker lines (outline icons) or an outline added (filled icons)
  const stroke = /stroke-width="([\d.]+)"/.exec(attributes);
  attributes = stroke
    ? attributes.replace(stroke[0], `stroke-width="${n(Number(stroke[1]) * 1.3)}"`)
    : `${attributes} stroke="#000" stroke-width="${n(0.6 * unit)}" stroke-linejoin="round"`;
  const offset = n(1.6 * unit);
  const grown = `viewBox="${n((x ?? 0) - unit)} ${n((y ?? 0) - unit)} ${n((width ?? 24) + 3 * unit)} ${n((height ?? 24) + 3 * unit)}"`;
  attributes = box ? attributes.replace(box[0], grown) : `${attributes} ${grown}`;
  return `<svg${attributes}><g opacity=".35" transform="translate(${offset} ${offset})">${inner}</g><g>${inner}</g></svg>`;
}

/** One built-in icon as SVG markup, drawn in a look. */
export const iconSvg = (set: DrawnIconSetId, meaning: IconMeaning, look: IconLookId): string =>
  styleIconSvg(ICON_SVGS[set][meaning], look);

/** Data URL for any icon markup in a look (custom sets, popup previews). */
export const svgDataUrl = (svg: string, look: IconLookId = 'plain') =>
  `data:image/svg+xml,${encodeURIComponent(styleIconSvg(svg, look))}`;

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
