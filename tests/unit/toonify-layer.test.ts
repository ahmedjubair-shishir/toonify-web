import { afterEach, describe, expect, it } from 'vitest';
import {
  ACTIVE_ATTRIBUTE,
  STYLE_ELEMENT_ID,
  applyLayer,
  createLayerGuard,
  isLayerApplied,
  removeLayer,
} from '@/content/toonify-layer';
import { MARK } from '@/content/classify';
import { buildThemeCss } from '@/content/theme-css';
import { classicCartoon } from '@/core/themes/classic-cartoon';

const CSS = buildThemeCss(classicCartoon);
const CONTENT = { css: CSS, filters: { cartoon: classicCartoon.cartoon, sketch: false } };

const styleCount = () => document.querySelectorAll(`#${STYLE_ELEMENT_ID}`).length;
// MutationObserver callbacks and our queued repair run as microtasks.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  removeLayer(document);
});

describe('applyLayer / removeLayer', () => {
  it('adds the attribute and exactly one style element', () => {
    applyLayer(document, CONTENT);
    expect(document.documentElement.hasAttribute(ACTIVE_ATTRIBUTE)).toBe(true);
    expect(styleCount()).toBe(1);
    expect(isLayerApplied(document)).toBe(true);
  });

  it('never duplicates the style element, even after many toggles', () => {
    for (let i = 0; i < 10; i++) {
      applyLayer(document, CONTENT);
      applyLayer(document, CONTENT);
      removeLayer(document);
    }
    applyLayer(document, CONTENT);
    expect(styleCount()).toBe(1);
  });

  it('removes every trace, and is safe to call when nothing is applied', () => {
    removeLayer(document);
    applyLayer(document, CONTENT);
    removeLayer(document);
    expect(document.documentElement.hasAttribute(ACTIVE_ATTRIBUTE)).toBe(false);
    expect(styleCount()).toBe(0);
    expect(isLayerApplied(document)).toBe(false);
  });

  it('only contains rules scoped under the active attribute', () => {
    applyLayer(document, CONTENT);
    const css = document.getElementById(STYLE_ELEMENT_ID)?.textContent ?? '';
    // Selector lists are the text before each `{` (values may contain commas).
    const selectors = css
      .split('}')
      .map((block) => block.split('{')[0]?.trim() ?? '')
      .filter((list) => list.length > 0)
      .flatMap((list) => list.split(','));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector.trim().startsWith(`html[${ACTIVE_ATTRIBUTE}]`)).toBe(true);
    }
    expect(css).not.toContain('!important');
  });

  it('never sets layout properties, so pages cannot shift or break', () => {
    const declarations = CSS.match(/^\s*[a-z-]+(?=:)/gm)?.map((d) => d.trim()) ?? [];
    expect(declarations.length).toBeGreaterThan(0);
    const layout =
      /^(display|position|top|left|right|bottom|width|height|min-|max-|margin|padding|z-index|overflow|float|flex|grid|inset|transform)/;
    expect(declarations.filter((d) => layout.test(d))).toEqual([]);
  });

  it('swaps the CSS in place when the theme changes', () => {
    applyLayer(document, CONTENT);
    applyLayer(document, { css: '/* other theme */', filters: { cartoon: null, sketch: false } });
    expect(styleCount()).toBe(1);
    expect(document.getElementById(STYLE_ELEMENT_ID)?.textContent).toBe('/* other theme */');
  });

  it('removes classifier marks too', () => {
    const img = document.createElement('img');
    img.setAttribute(MARK, 'media');
    document.body.append(img);
    applyLayer(document, CONTENT);
    removeLayer(document);
    expect(img.hasAttribute(MARK)).toBe(false);
    img.remove();
  });
});

describe('createLayerGuard', () => {
  it('re-applies the layer when a site removes it while enabled', async () => {
    const guard = createLayerGuard(
      document,
      () => true,
      () => CONTENT,
    );
    applyLayer(document, CONTENT);
    guard.start();

    document.documentElement.removeAttribute(ACTIVE_ATTRIBUTE);
    document.getElementById(STYLE_ELEMENT_ID)?.remove();
    await flush();

    expect(isLayerApplied(document)).toBe(true);
    expect(styleCount()).toBe(1);
    guard.stop();
  });

  it('does nothing once stopped', async () => {
    const guard = createLayerGuard(
      document,
      () => true,
      () => CONTENT,
    );
    applyLayer(document, CONTENT);
    guard.start();
    guard.stop();

    removeLayer(document);
    await flush();

    expect(isLayerApplied(document)).toBe(false);
  });

  it('does not re-apply when Toonify is disabled', async () => {
    let enabled = true;
    const guard = createLayerGuard(
      document,
      () => enabled,
      () => CONTENT,
    );
    applyLayer(document, CONTENT);
    guard.start();

    enabled = false;
    removeLayer(document);
    await flush();

    expect(isLayerApplied(document)).toBe(false);
    guard.stop();
  });

  it('ignores a second start() call (no duplicate observers)', async () => {
    const guard = createLayerGuard(
      document,
      () => true,
      () => CONTENT,
    );
    applyLayer(document, CONTENT);
    guard.start();
    guard.start();

    document.getElementById(STYLE_ELEMENT_ID)?.remove();
    await flush();

    expect(styleCount()).toBe(1);
    guard.stop();
  });
});
