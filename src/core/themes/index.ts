import { celShaded } from './cel-shaded';
import { classicCartoon } from './classic-cartoon';
import { comicBook } from './comic-book';
import { monochromeInk } from './monochrome-ink';
import { oilPainting } from './oil-painting';
import { pencilSketch } from './pencil-sketch';
import { popArt } from './pop-art';
import { renaissance } from './renaissance';
import { storybook } from './storybook';
import { vintagePoster } from './vintage-poster';
import { watercolor } from './watercolor';
import type { ThemeTokens } from './types';

export type { CartoonFilter, InkShadow, MediaTreatment, Texture, ThemeTokens } from './types';

/**
 * Every available theme, in display order (spec 4.1 preset list). Add new
 * presets here; each is plain data in its own file.
 */
export const THEMES: readonly ThemeTokens[] = [
  classicCartoon,
  comicBook,
  storybook,
  watercolor,
  pencilSketch,
  popArt,
  oilPainting,
  vintagePoster,
  celShaded,
  monochromeInk,
  renaissance,
];

export const DEFAULT_THEME_ID = classicCartoon.id;

/**
 * Tokens for a theme id. Unknown ids fall back to Classic Cartoon. Used as
 * the base for effects, and for the (paused) AI feature, even when a site
 * keeps its original style.
 */
export function getTheme(id: string | undefined): ThemeTokens {
  return THEMES.find((theme) => theme.id === id) ?? classicCartoon;
}

/**
 * "Original": the site keeps its own look (no theme). It is every site's
 * default (owner request, 19 Nov 2026), so turning Toonify on for a site
 * changes nothing until the user picks a style, effect or icon set.
 */
export const ORIGINAL_STYLE_ID = 'original';

export interface StyleOption {
  id: string;
  name: string;
  description: string;
}

export const ORIGINAL_STYLE: StyleOption = {
  id: ORIGINAL_STYLE_ID,
  name: 'Original',
  description: "The site's own look",
};

/** Every style choice in the popup: Original first, then the themes. */
export const STYLE_OPTIONS: readonly StyleOption[] = [
  ORIGINAL_STYLE,
  ...THEMES.map(({ id, name, description }) => ({ id, name, description })),
];

/** Missing, "original" and unknown ids (e.g. a removed theme) all mean Original. */
export const isOriginalStyle = (id: string | undefined): boolean =>
  !THEMES.some((theme) => theme.id === id);

/** The chosen style id for a site: a theme id or "original". */
export const styleId = (id: string | undefined): string =>
  isOriginalStyle(id) ? ORIGINAL_STYLE_ID : (id as string);

/** The chosen style's display name. */
export const styleName = (id: string | undefined): string =>
  isOriginalStyle(id) ? ORIGINAL_STYLE.name : getTheme(id).name;
