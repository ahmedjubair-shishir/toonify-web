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

/** Unknown ids (e.g. a theme removed in an update) fall back to the default. */
export function getTheme(id: string | undefined): ThemeTokens {
  return THEMES.find((theme) => theme.id === id) ?? classicCartoon;
}
