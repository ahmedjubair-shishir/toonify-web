import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { classify, isMostlyLatin, type Measure } from '@/content/classify';
import { buildEffectsCss } from '@/content/effects-css';
import { SKETCH_FILTER_ID, createFilterElement } from '@/content/image-filter';
import { detectScheme, luminance, parseRgb } from '@/content/page-scheme';
import { ACTIVE_ATTRIBUTE } from '@/content/toonify-layer';
import {
  EFFECTS,
  EFFECT_IDS,
  NO_EFFECTS,
  parseEffects,
  resolveEffects,
  type EffectId,
} from '@/core/effects';
import {
  getSettings,
  parseSettings,
  setSiteEffect,
  setSiteEnabled,
  setSiteTheme,
} from '@/core/settings';
import type { SiteKey } from '@/core/site';
import { THEMES } from '@/core/themes';
import { classicCartoon } from '@/core/themes/classic-cartoon';

const fonts = {
  latin: 'chrome-extension://x/fonts/fredoka-latin.woff2',
  latinExt: 'chrome-extension://x/fonts/fredoka-latin-ext.woff2',
};
const only = (id: EffectId) => ({ ...NO_EFFECTS, [id]: true });
const ALL = Object.fromEntries(EFFECT_IDS.map((id) => [id, true])) as Record<EffectId, boolean>;

describe('effects catalogue and settings', () => {
  it('lists every effect once, all off by default', () => {
    expect(EFFECTS.map((e) => e.id)).toEqual([...EFFECT_IDS]);
    expect(Object.values(NO_EFFECTS).every((on) => !on)).toBe(true);
    expect(resolveEffects(undefined)).toEqual(NO_EFFECTS);
    expect(resolveEffects({ sketch: true }).sketch).toBe(true);
  });

  it('keeps only known on/off switches from storage', () => {
    expect(parseEffects({ sketch: true, sticker: 'yes', evil: true })).toEqual({ sketch: true });
    expect(parseEffects('nope')).toBeUndefined();
    expect(
      parseSettings({ sites: { 'a.com': { enabled: true, effects: { bouncy: true } } } }).sites[
        'a.com'
      ],
    ).toEqual({
      enabled: true,
      effects: { bouncy: true },
    });
  });

  describe('per site', () => {
    beforeEach(() => fakeBrowser.reset());
    it('switching an effect keeps the site on/off state and style', async () => {
      const site = 'example.com' as SiteKey;
      await setSiteEnabled(site, true);
      await setSiteTheme(site, 'storybook');
      await setSiteEffect(site, 'sticker', true);
      await setSiteEffect(site, 'texture', true);
      await setSiteEffect(site, 'sticker', false);
      await setSiteEnabled(site, false);
      await setSiteEnabled(site, true);
      expect((await getSettings()).sites[site]).toEqual({
        enabled: true,
        theme: 'storybook',
        effects: { sticker: false, texture: true },
      });
    });
  });
});

describe('buildEffectsCss', () => {
  it('adds nothing when every effect is off', () => {
    expect(buildEffectsCss(classicCartoon, NO_EFFECTS, fonts)).toBe('');
  });

  it.each(THEMES.map((t) => [t.name, t] as const))(
    '%s: all effects are scoped, safe and well-formed',
    (_n, theme) => {
      const css = buildEffectsCss(theme, ALL, fonts);
      expect(css).not.toContain('!important');
      expect(css).not.toMatch(/undefined|NaN/);
      expect(css.split('{').length).toBe(css.split('}').length);
      // Every rule outside @font-face / @media is under the active attribute.
      const selectors = css
        .replace(/@font-face\s*\{[^}]*\}/g, '')
        .replace(/@media[^{]*\{/g, '')
        .split('}')
        .map((block) => block.split('{')[0]?.trim() ?? '')
        .filter((sel) => sel.length > 0)
        .flatMap((sel) => sel.split(/,(?![^(]*\))/));
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors)
        expect(selector.trim().startsWith(`html[${ACTIVE_ATTRIBUTE}]`)).toBe(true);
      // Layout properties stay off-limits, except the two documented visual ones.
      const declarations =
        css
          .replace(/@font-face\s*\{[^}]*\}/g, '')
          .match(/^\s*[a-z-]+(?=:)/gm)
          ?.map((d) => d.trim()) ?? [];
      const layout =
        /^(display|top|left|right|bottom|width|height|min-|max-|margin|padding|float|flex|grid)/;
      expect(declarations.filter((d) => layout.test(d))).toEqual([]);
    },
  );

  it('motion only runs when the user has not asked for reduced motion', () => {
    const bouncy = buildEffectsCss(classicCartoon, only('bouncy'), fonts);
    expect(bouncy.trim().startsWith('@media (prefers-reduced-motion: no-preference)')).toBe(true);
    const sticker = buildEffectsCss(classicCartoon, only('sticker'), fonts);
    expect(sticker).toMatch(/@media \(prefers-reduced-motion: no-preference\)[^@]*transition/);
  });

  it('keeps focus rings: sketch never touches :focus-visible outlines', () => {
    const css = buildEffectsCss(classicCartoon, only('sketch'), fonts);
    expect(css).not.toMatch(/outline/);
    expect(css).toContain(':not(:focus-visible)');
    expect(css).toContain(`url(#${SKETCH_FILTER_ID})`);
  });

  it('headings use the bundled font for Latin only, with unicode ranges', () => {
    const css = buildEffectsCss(classicCartoon, only('headings'), fonts);
    expect(css).toContain(fonts.latin);
    expect(css).toContain(fonts.latinExt);
    expect(css.match(/unicode-range/g)).toHaveLength(2);
    expect(css).toContain('[data-toonify="heading"]');
  });

  it('comic background is click-through and changes with the style', () => {
    const textures = THEMES.map((theme) => buildEffectsCss(theme, only('texture'), fonts));
    for (const css of textures) expect(css).toContain('pointer-events: none');
    expect(new Set(textures).size).toBe(THEMES.length);
  });

  it('the sketch filter is a fixed-seed wobble (no shimmer)', () => {
    const svg = createFilterElement(document, { cartoon: null, sketch: true });
    const filter = svg.querySelector(`#${SKETCH_FILTER_ID}`);
    expect(filter?.querySelector('feTurbulence')?.getAttribute('seed')).toBe('7');
    expect(filter?.querySelector('feDisplacementMap')).not.toBeNull();
  });
});

describe('headings and scripts', () => {
  const measure: Measure = () => ({ width: 100, height: 30 });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each([
    ['Classic cartoon heading', true],
    ['Café crème', true],
    ['বাংলা শিরোনাম', false],
    ['عنوان عربي', false],
    ['日本語の見出し', false],
    ['2026', false],
  ])('%s -> Latin: %s', (text, latin) => {
    expect(isMostlyLatin(text)).toBe(latin);
    document.body.innerHTML = `<h2>${text}</h2>`;
    expect(classify(document.querySelector('h2') as Element, measure)).toBe(
      latin ? 'heading' : null,
    );
  });
});

describe('page light/dark detection', () => {
  afterEach(() => {
    document.body.style.backgroundColor = '';
    document.documentElement.style.backgroundColor = '';
  });

  it('reads colours', () => {
    expect(parseRgb('rgba(0, 0, 0, 0)')).toEqual([0, 0, 0, 0]);
    expect(parseRgb('rgb(255 255 255)')).toEqual([255, 255, 255, 1]);
    expect(luminance([255, 255, 255, 1])).toBeCloseTo(1);
    expect(luminance([0, 0, 0, 1])).toBeCloseTo(0);
  });

  it('dark body -> dark; transparent -> light (browser default)', () => {
    expect(detectScheme(document)).toBe('light');
    document.body.style.backgroundColor = 'rgb(18, 18, 24)';
    expect(detectScheme(document)).toBe('dark');
    document.body.style.backgroundColor = 'rgb(250, 250, 250)';
    expect(detectScheme(document)).toBe('light');
  });
});
