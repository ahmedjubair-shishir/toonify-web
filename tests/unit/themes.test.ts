import { describe, expect, it } from 'vitest';
import { ACTIVE_ATTRIBUTE } from '@/content/toonify-layer';
import { buildThemeCss } from '@/content/theme-css';
import {
  DEFAULT_THEME_ID,
  ORIGINAL_STYLE_ID,
  STYLE_OPTIONS,
  THEMES,
  getTheme,
  isOriginalStyle,
  styleId,
  styleName,
} from '@/core/themes';

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
        // Either a marked element, or the page root itself (ink colour
        // settings only, checked below).
        expect(selector.trim()).toMatch(
          new RegExp(
            `^html\\[${ACTIVE_ATTRIBUTE}\\](\\[data-toonify-scheme="dark"\\])?( \\[data-toonify="(media|button|field)"\\]|$)`,
          ),
        );
      }
    });

    it('root rules only set Toonify’s own ink variables', () => {
      const rootBlocks = css.match(/^html\[[^\]]+\](\[[^\]]+\])? \{[^}]*\}/gm) ?? [];
      expect(rootBlocks.length).toBe(2);
      for (const block of rootBlocks) {
        const props = block.match(/^\s*[a-z-]+(?=:)/gm)?.map((p) => p.trim()) ?? [];
        for (const prop of props) expect(prop.startsWith('--toonify-')).toBe(true);
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
  expect(new Set(THEMES.map((theme) => buildThemeCss(theme))).size).toBe(THEMES.length);
});

describe('Original style (the site keeps its own look)', () => {
  it("is every site's default, and what removed or unknown ids mean", () => {
    expect(isOriginalStyle(undefined)).toBe(true);
    expect(isOriginalStyle('original')).toBe(true);
    expect(isOriginalStyle('removed-theme')).toBe(true);
    expect(isOriginalStyle('comic-book')).toBe(false);
    expect(styleId(undefined)).toBe(ORIGINAL_STYLE_ID);
    expect(styleId('storybook')).toBe('storybook');
    expect(styleName(undefined)).toBe('Original');
    expect(styleName('pop-art')).toBe('Pop Art');
  });

  it('comes first in the popup, before the 11 themes', () => {
    expect(STYLE_OPTIONS[0]?.id).toBe(ORIGINAL_STYLE_ID);
    expect(STYLE_OPTIONS).toHaveLength(THEMES.length + 1);
  });

  it('only sets ink for effects: no rules for photos, buttons or fields', () => {
    const css = buildThemeCss(getTheme(undefined), true);
    expect(css).toContain('--toonify-ink:');
    expect(css).not.toMatch(/data-toonify="(media|button|field)"/);
  });
});
