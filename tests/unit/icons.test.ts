import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { classifyIcon, clearMarks, markTree, type Measure } from '@/content/classify';
import { ICON_MARK, iconMeaning, meaningOf, words } from '@/content/icon-meaning';
import { buildIconsCss, needsIconSketch } from '@/content/icons-css';
import { createFilterElement, ICON_SKETCH_FILTER_ID } from '@/content/image-filter';
import {
  ICON_LOOK_IDS,
  ICON_MEANINGS,
  ICON_SET_IDS,
  ICON_SVGS,
  iconFilePath,
  iconPublicFiles,
  iconSvg,
  iconsActive,
  resolveIcons,
  type DrawnIconSetId,
} from '@/core/icons';
import { getSettings, parseSettings, setSiteEnabled, setSiteIcons } from '@/core/settings';
import type { SiteKey } from '@/core/site';

const measure: Measure = (element) => {
  const [width = 0, height = 0] = (element.getAttribute('data-size') ?? '0x0')
    .split('x')
    .map(Number);
  return { width, height };
};

const html = (markup: string) => {
  document.body.innerHTML = markup;
  return document.body.firstElementChild as Element;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('words / meaningOf', () => {
  it('splits icon names in every common style', () => {
    expect(words('fa-solid fa-MagnifyingGlass')).toEqual([
      'fa',
      'solid',
      'fa',
      'magnifying',
      'glass',
    ]);
    expect(words('#icon_search')).toEqual(['icon', 'search']);
  });

  it.each([
    ['fa-solid fa-magnifying-glass', 'search'],
    ['bi bi-x-lg', 'close'],
    ['fa fa-bars', 'menu'],
    ['icon-arrow-left', 'arrow-left'],
    ['ti ti-chevron-down', 'chevron-down'],
    ['expand_more', 'chevron-down'],
    ['shopping-cart', 'cart'],
    ['log-out', 'logout'],
    ['open_in_new', 'external'],
    ['thumb_up', 'thumbs-up'],
  ])('reads the name %j as %s', (name, meaning) => {
    expect(meaningOf(name)).toBe(meaning);
  });

  it('prefers the specific word in a label', () => {
    expect(meaningOf('Add to cart', true)).toBe('cart');
    expect(meaningOf('Delete comment', true)).toBe('trash');
    expect(meaningOf('Open menu', true)).toBe('menu');
  });

  it('does not read single letters or sentences from labels', () => {
    expect(meaningOf('X', true)).toBeNull(); // the X (Twitter) logo is not "close"
    expect(meaningOf('Read more about our search and privacy policy', true)).toBeNull();
    expect(meaningOf('random words', true)).toBeNull();
  });
});

describe('iconMeaning', () => {
  it('uses class names, sprite links, data-icon and ligature text', () => {
    expect(iconMeaning(html('<i class="fa fa-search"></i>'))).toBe('search');
    expect(iconMeaning(html('<svg><use href="#icon-bell"></use></svg>'))).toBe('bell');
    expect(iconMeaning(html('<span data-icon="home"></span>'))).toBe('home');
    expect(iconMeaning(html('<span class="material-icons">play_arrow</span>'))).toBe('play');
  });

  it("falls back to the icon's label, then the icon-only button's label", () => {
    expect(iconMeaning(html('<svg aria-label="Settings"></svg>'))).toBe('settings');
    expect(iconMeaning(html('<svg><title>Share</title></svg>'))).toBe('share');
    document.body.innerHTML = '<button aria-label="Close dialog"><svg id="i"></svg></button>';
    expect(iconMeaning(document.getElementById('i') as Element)).toBe('close');
  });

  it('ignores the label of a button that has text (the text is the meaning)', () => {
    document.body.innerHTML = '<button aria-label="Search">Go <svg id="i"></svg></button>';
    expect(iconMeaning(document.getElementById('i') as Element)).toBe('other');
  });

  it('marks unknown icons as "other"', () => {
    expect(iconMeaning(html('<svg class="logo"></svg>'))).toBe('other');
  });
});

describe('classifyIcon', () => {
  it('accepts small svgs, font icons and small images', () => {
    expect(classifyIcon(html('<svg class="icon-search" data-size="20x20"></svg>'), measure)).toBe(
      'search',
    );
    expect(classifyIcon(html('<i class="fa fa-heart" data-size="16x16"></i>'), measure)).toBe(
      'heart',
    );
    expect(classifyIcon(html('<img src="/i/star.svg" data-size="24x24">'), measure)).toBe('star');
  });

  it('rejects big pictures, tiny dots, italic text and nested svgs', () => {
    expect(
      classifyIcon(html('<svg class="icon-search" data-size="200x200"></svg>'), measure),
    ).toBeNull();
    expect(classifyIcon(html('<img src="/star.png" data-size="48x48">'), measure)).toBeNull();
    expect(classifyIcon(html('<svg data-size="4x4"></svg>'), measure)).toBeNull();
    expect(classifyIcon(html('<i data-size="40x16">really</i>'), measure)).toBeNull();
    expect(classifyIcon(html('<span class="price" data-size="20x20"></span>'), measure)).toBeNull();
    document.body.innerHTML =
      '<svg data-size="24x24"><svg id="inner" data-size="10x10"></svg></svg>';
    expect(classifyIcon(document.getElementById('inner') as Element, measure)).toBeNull();
  });

  it('keeps aria-hidden icons (normal for icons) but respects no-go zones', () => {
    expect(
      classifyIcon(
        html('<svg aria-hidden="true" class="icon-menu" data-size="24x24"></svg>'),
        measure,
      ),
    ).toBe('menu');
    expect(
      classifyIcon(
        html(
          '<div contenteditable="true"><svg id="i" class="icon-menu" data-size="24x24"></svg></div>',
        ).querySelector('svg') as Element,
        measure,
      ),
    ).toBeNull();
  });

  it('marks icons only when asked, and clearMarks removes them', () => {
    document.body.innerHTML = '<svg class="icon-search" data-size="20x20"></svg>';
    markTree(document, measure);
    expect(document.querySelector(`[${ICON_MARK}]`)).toBeNull();
    markTree(document, measure, true);
    expect(document.querySelector('svg')?.getAttribute(ICON_MARK)).toBe('search');
    clearMarks(document);
    expect(document.querySelector(`[${ICON_MARK}]`)).toBeNull();
  });
});

describe('icon set data (generated)', () => {
  const drawn = ICON_SET_IDS.filter((id) => id !== 'original') as DrawnIconSetId[];

  it('has every meaning in every set, as clean single-colour SVG', () => {
    for (const set of drawn) {
      for (const meaning of ICON_MEANINGS) {
        const svg = ICON_SVGS[set][meaning];
        expect(svg, `${set}/${meaning}`).toMatch(
          /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+"/,
        );
        expect(svg).not.toMatch(/<script|<foreignObject|<image|\son\w+=|currentColor|href=/i);
      }
    }
  });

  it('draws every look as well-formed SVG', () => {
    const parser = new DOMParser();
    for (const set of drawn) {
      for (const look of ICON_LOOK_IDS) {
        const doc = parser.parseFromString(iconSvg(set, 'search', look), 'image/svg+xml');
        expect(doc.querySelector('parsererror'), `${set}/${look}`).toBeNull();
        expect(doc.documentElement.localName).toBe('svg');
      }
    }
    expect(iconSvg('lucide', 'search', 'cartoon')).toContain('stroke-width="2.6"');
    expect(iconSvg('phosphor', 'search', 'sketch')).toContain('feDisplacementMap');
  });
});

const url = (path: string) => `chrome-extension://abc${path}`;

describe('buildIconsCss', () => {
  it('is empty while icons are original and plain', () => {
    expect(buildIconsCss(resolveIcons(undefined, undefined), url)).toBe('');
    expect(iconsActive(resolveIcons('original', 'plain'))).toBe(false);
  });

  it('swaps known icons only, with a mask in the text colour', () => {
    const css = buildIconsCss({ set: 'lucide', look: 'plain' }, url);
    expect(css).toContain(
      `[${ICON_MARK}="search"] { --toonify-icon: url("chrome-extension://abc/icons/lucide/plain/search.svg"); }`,
    );
    expect(css).toContain(`:not([${ICON_MARK}="other"])`);
    expect(css).toMatch(/background: currentColor/);
  });

  it('applies looks to icons that keep their own drawing', () => {
    expect(buildIconsCss({ set: 'original', look: 'sketch' }, url)).toContain(
      `filter: url(#${ICON_SKETCH_FILTER_ID})`,
    );
    expect(needsIconSketch({ set: 'original', look: 'sketch' })).toBe(true);
    expect(buildIconsCss({ set: 'tabler', look: 'cartoon' }, url)).toContain(
      `[${ICON_MARK}="other"] {\n  filter: drop-shadow`,
    );
  });

  it('only animates without reduced motion, and never with transform', () => {
    const css = buildIconsCss({ set: 'phosphor', look: 'animated' }, url);
    const animationAt = css.indexOf('animation:');
    expect(
      css.lastIndexOf('@media (prefers-reduced-motion: no-preference)', animationAt),
    ).toBeGreaterThan(-1);
    expect(css).not.toMatch(/transform\s*:/);
  });

  it.each(ICON_SET_IDS.flatMap((set) => ICON_LOOK_IDS.map((look) => [set, look] as const)))(
    'is safe for %s / %s (no layout properties, no !important, scoped)',
    (set, look) => {
      const css = buildIconsCss({ set, look }, url);
      expect(css).not.toContain('!important');
      const withoutUrls = css.replace(/url\("[^"]*"\)/g, 'url()');
      const declarations = withoutUrls.match(/[a-z-]+\s*:/g) ?? [];
      const layout =
        /^(display|position|width|height|margin|padding|top|left|right|bottom|z-index|overflow|float|flex|grid|inset)[\s:-]/;
      expect(declarations.filter((d) => layout.test(d))).toEqual([]);
      for (const rule of withoutUrls.split('}')) {
        const selector = rule.split('{')[0]?.trim() ?? '';
        if (selector === '' || selector.startsWith('@') || /^\d|^\d+%|^(from|to)\b/.test(selector))
          continue;
        if (/^[\d%, ]+$/.test(selector)) continue;
        if (!selector.includes('rotate') && !selector.includes('scale'))
          expect(selector, selector).toMatch(/html\[data-toonify-active\]/);
      }
    },
  );
});

describe('icon files', () => {
  it('has one file per set, drawn look and meaning, at the path the CSS uses', () => {
    const files = iconPublicFiles();
    expect(files).toHaveLength(3 * 3 * ICON_MEANINGS.length);
    const paths = new Set(files.map((f) => f.relativeDest));
    expect(paths.size).toBe(files.length);
    expect(paths).toContain(iconFilePath('tabler', 'menu', 'animated')); // animated uses plain
    expect(iconFilePath('tabler', 'menu', 'animated')).toBe('icons/tabler/plain/menu.svg');
    const cartoon = files.find((f) => f.relativeDest === 'icons/phosphor/cartoon/heart.svg');
    expect(cartoon?.contents).toBe(iconSvg('phosphor', 'heart', 'cartoon'));
  });
});

describe('icon sketch filter', () => {
  it('is only built when the look needs it', () => {
    const without = createFilterElement(document, { cartoon: null, sketch: false });
    expect(without.querySelector(`#${ICON_SKETCH_FILTER_ID}`)).toBeNull();
    const withIcon = createFilterElement(document, {
      cartoon: null,
      sketch: false,
      iconSketch: true,
    });
    expect(withIcon.querySelector(`#${ICON_SKETCH_FILTER_ID}`)).not.toBeNull();
  });
});

describe('icon settings', () => {
  const site = 'example.com' as SiteKey;
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('keeps valid icon choices and drops unknown ones', () => {
    const parsed = parseSettings({
      globalEnabled: true,
      sites: {
        'a.com': { enabled: true, iconSet: 'lucide', iconLook: 'animated' },
        'b.com': { enabled: true, iconSet: 'emoji', iconLook: 42 },
      },
    });
    expect(parsed.sites['a.com']).toEqual({
      enabled: true,
      iconSet: 'lucide',
      iconLook: 'animated',
    });
    expect(parsed.sites['b.com']).toEqual({ enabled: true });
  });

  it('saves set and look separately without turning the site on or off', async () => {
    await setSiteEnabled(site, true);
    await setSiteIcons(site, { set: 'phosphor' });
    await setSiteIcons(site, { look: 'cartoon' });
    expect((await getSettings()).sites[site]).toEqual({
      enabled: true,
      iconSet: 'phosphor',
      iconLook: 'cartoon',
    });
  });
});
