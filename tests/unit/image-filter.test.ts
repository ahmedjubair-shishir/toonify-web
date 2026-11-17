import { afterEach, describe, expect, it } from 'vitest';
import {
  CARTOON_FILTER_ID,
  FILTER_ELEMENT_ID,
  bands,
  createFilterElement,
} from '@/content/image-filter';
import { buildThemeCss } from '@/content/theme-css';
import { applyLayer, createLayerGuard, isLayerApplied, removeLayer } from '@/content/toonify-layer';
import { THEMES } from '@/core/themes';
import { classicCartoon } from '@/core/themes/classic-cartoon';
import { comicBook } from '@/core/themes/comic-book';

const content = (theme = classicCartoon) => ({ css: buildThemeCss(theme), filter: theme.cartoon });
const filters = () => document.querySelectorAll(`#${FILTER_ELEMENT_ID}`);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => removeLayer(document));

describe('bands', () => {
  it('spreads colour levels evenly from 0 to 1 and clamps the count', () => {
    expect(bands(4)).toBe('0.125 0.375 0.625 0.875');
    expect(bands(1)).toBe('0.25 0.75');
    expect(bands(99).split(' ')).toHaveLength(16);
  });
});

describe('createFilterElement', () => {
  it('builds a hidden svg with one filter: smooth, flatten, ink, combine', () => {
    const svg = createFilterElement(document, {
      smooth: 0.8,
      levels: 4,
      flatten: 0.6,
      edge: 5,
      threshold: 0.05,
      edgeWidth: 0.6,
    });
    expect(svg.id).toBe(FILTER_ELEMENT_ID);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const filter = svg.querySelector(`filter#${CARTOON_FILTER_ID}`);
    const steps = [...(filter?.children ?? [])].map((node) => node.localName);
    expect(steps).toEqual([
      'feGaussianBlur',
      'feComponentTransfer',
      'feComposite',
      'feGaussianBlur',
      'feColorMatrix',
      'feConvolveMatrix',
      'feComponentTransfer',
      'feMorphology',
      'feMorphology',
      'feComposite',
      'feFlood',
      'feComposite',
      'feBlend',
      'feComposite',
    ]);
  });

  it('skips the ink steps when a style has no lines', () => {
    const svg = createFilterElement(document, {
      smooth: 1,
      levels: 8,
      flatten: 0.5,
      edge: 0,
      threshold: 0,
      edgeWidth: 0,
    });
    const steps = [...(svg.querySelector('filter')?.children ?? [])].map((n) => n.localName);
    expect(steps).toEqual(['feGaussianBlur', 'feComponentTransfer', 'feComposite', 'feComposite']);
  });
});

describe('image filter in the layer', () => {
  it('every style that redraws images references the filter in its CSS', () => {
    for (const theme of THEMES) {
      expect(buildThemeCss(theme).includes(`url(#${CARTOON_FILTER_ID})`)).toBe(
        theme.cartoon !== null,
      );
    }
  });

  it('is added once with the layer and removed with it', () => {
    applyLayer(document, content());
    applyLayer(document, content());
    expect(filters()).toHaveLength(1);
    expect(isLayerApplied(document)).toBe(true);
    removeLayer(document);
    expect(filters()).toHaveLength(0);
  });

  it('is replaced when the style changes, and removed for styles without it', () => {
    applyLayer(document, content(classicCartoon));
    const first = filters()[0];
    applyLayer(document, content(comicBook));
    expect(filters()).toHaveLength(1);
    expect(filters()[0]).not.toBe(first);
    applyLayer(document, { css: '/* no redraw */', filter: null });
    expect(filters()).toHaveLength(0);
  });

  it('counts as missing (and is restored) if a site deletes it', async () => {
    const guard = createLayerGuard(
      document,
      () => true,
      () => content(),
    );
    applyLayer(document, content());
    guard.start();
    filters()[0]?.remove();
    expect(isLayerApplied(document)).toBe(false);
    await flush();
    expect(filters()).toHaveLength(1);
    guard.stop();
  });
});
