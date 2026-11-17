import { describe, expect, it } from 'vitest';
import { ACTIVE_ATTRIBUTE } from '@/content/toonify-layer';
import { buildThemeCss } from '@/content/theme-css';
import { DEFAULT_THEME_ID, THEMES, getTheme } from '@/core/themes';

const selectorsOf = (css: string) =>
  css
    .split('}')
    .map((block) => block.split('{')[0]?.trim() ?? '')
    .filter((list) => list.length > 0)
    .flatMap((list) => list.split(','));

const LAYOUT =
  /^(display|position|top|left|right|bottom|width|height|min-|max-|margin|padding|z-index|overflow|float|flex|grid|inset|transform)/;

describe('theme registry', () => {
  it('has unique, valid ids and names', () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of THEMES) {
      expect(theme.id).toMatch(/^[a-z0-9-]{1,64}$/);
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
    }
  });

  it('falls back to the default for unknown ids', () => {
    expect(getTheme('removed-theme').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID);
    expect(getTheme('comic-book').id).toBe('comic-book');
  });
});

describe.each(THEMES.map((theme) => [theme.name, theme] as const))(
  'buildThemeCss(%s)',
  (_name, theme) => {
    const css = buildThemeCss(theme);

    it('only targets marked elements under the active attribute', () => {
      const selectors = selectorsOf(css);
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors) {
        expect(selector.trim()).toMatch(
          new RegExp(`^html\\[${ACTIVE_ATTRIBUTE}\\] \\[data-toonify="(media|button|field)"\\]`),
        );
      }
    });

    it('uses visual properties only, without !important', () => {
      const declarations = css.match(/^\s*[a-z-]+(?=:)/gm)?.map((d) => d.trim()) ?? [];
      expect(declarations.filter((d) => LAYOUT.test(d))).toEqual([]);
      expect(css).not.toContain('!important');
    });

    it('produces balanced, non-empty rules (no undefined values)', () => {
      expect(css.split('{').length).toBe(css.split('}').length);
      expect(css).not.toMatch(/undefined|NaN/);
    });
  },
);

it('the three styles really look different', () => {
  expect(new Set(THEMES.map(buildThemeCss)).size).toBe(THEMES.length);
});
