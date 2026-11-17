import { classicCartoon } from './classic-cartoon';
import { comicBook } from './comic-book';
import { storybook } from './storybook';
import type { ThemeTokens } from './types';

export type { CartoonFilter, InkShadow, ThemeTokens } from './types';

/** Every available theme, in display order. Add new presets here. */
export const THEMES: readonly ThemeTokens[] = [classicCartoon, comicBook, storybook];

export const DEFAULT_THEME_ID = classicCartoon.id;

/** Unknown ids (e.g. a theme removed in an update) fall back to the default. */
export function getTheme(id: string | undefined): ThemeTokens {
  return THEMES.find((theme) => theme.id === id) ?? classicCartoon;
}
