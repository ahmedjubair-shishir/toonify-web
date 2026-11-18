import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ICON_MARK } from '@/content/icon-meaning';
import { buildIconsCss } from '@/content/icons-css';
import {
  CANDIDATE_NAMES,
  downloadIconSet,
  getCustomIconSets,
  parseCustomIconSets,
  parseIconSource,
  removeCustomIconSet,
  sanitizeSvg,
  saveCustomIconSet,
  suggestName,
} from '@/core/custom-icons';
import { ICON_MEANINGS } from '@/core/icons';
import { getSettings, setSiteEnabled, setSiteIcons } from '@/core/settings';
import type { SiteKey } from '@/core/site';

const SQUARE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/></svg>';

const respond = (body: string, status = 200) =>
  Promise.resolve(new Response(body, { status, headers: { 'content-type': 'image/svg+xml' } }));

describe('parseIconSource', () => {
  it('reads Iconify set names and links', () => {
    expect(parseIconSource('mdi')).toEqual({ kind: 'iconify', prefix: 'mdi' });
    expect(parseIconSource(' material-symbols ')).toEqual({
      kind: 'iconify',
      prefix: 'material-symbols',
    });
    expect(parseIconSource('https://icon-sets.iconify.design/ph/')).toEqual({
      kind: 'iconify',
      prefix: 'ph',
    });
    expect(parseIconSource('https://api.iconify.design/mdi/home.svg')).toEqual({
      kind: 'iconify',
      prefix: 'mdi',
    });
  });

  it('reads CDN links with {name}', () => {
    expect(parseIconSource('https://cdn.jsdelivr.net/npm/ionicons@7/dist/svg/{name}.svg')).toEqual({
      kind: 'template',
      url: 'https://cdn.jsdelivr.net/npm/ionicons@7/dist/svg/{name}.svg',
    });
  });

  it('refuses unsafe or incomplete input, with a reason', () => {
    expect(parseIconSource('')).toHaveProperty('error');
    expect(parseIconSource('http://cdn.example.com/{name}.svg')).toHaveProperty('error');
    expect(parseIconSource('https://cdn.example.com/icons/home.svg')).toHaveProperty('error');
    expect(parseIconSource('https://cdn.example.com/icons/{name}.svg')).toHaveProperty(
      'kind',
      'template',
    );
    expect(parseIconSource('javascript:alert(1)')).toHaveProperty('error');
    // Plain http only for local testing.
    expect(parseIconSource('http://localhost:4173/cdn/{name}.svg')).toHaveProperty(
      'kind',
      'template',
    );
  });

  it('matches known icon font or CSS links to the same set on Iconify', () => {
    expect(parseIconSource('https://use.hugeicons.com/font/icons.css')).toEqual({
      kind: 'iconify',
      prefix: 'hugeicons',
      note: 'Hugeicons found. Toonify uses its SVG version from Iconify.',
    });
    expect(
      parseIconSource('https://cdn.jsdelivr.net/npm/remixicon@4/fonts/remixicon.css'),
    ).toHaveProperty('prefix', 'ri');
    const unknown = parseIconSource('https://cdn.example.com/my-font/icons.css');
    expect(unknown).toHaveProperty('error');
    expect((unknown as { error: string }).error).toMatch(/icon font or stylesheet/);
  });

  it('suggests a readable name', () => {
    expect(suggestName({ kind: 'iconify', prefix: 'mdi' })).toBe('Material Design');
    expect(suggestName({ kind: 'iconify', prefix: 'tabler' })).toBe('tabler');
    expect(
      suggestName({
        kind: 'template',
        url: 'https://cdn.jsdelivr.net/npm/ionicons@7/dist/svg/{name}.svg',
      }),
    ).toBe('ionicons');
  });
});

describe('sanitizeSvg', () => {
  it('keeps drawing, drops scripts, links, handlers, styles and size', () => {
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" onload="alert(1)" style="color:red">' +
        '<script>alert(1)</script><foreignObject><div>x</div></foreignObject>' +
        '<image href="https://evil.example/x.png"/><use href="https://evil.example/s.svg#a"/>' +
        '<path d="M0 0h10v10z" fill="currentColor" onclick="x()" class="a"/></svg>',
    );
    expect(svg).not.toBeNull();
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toContain('<path');
    expect(svg).not.toMatch(
      /script|foreignObject|<image|<use|onload|onclick|style=|class=|width=|evil/i,
    );
    expect(svg).not.toContain('currentColor');
  });

  it('rejects things that are not SVG drawings', () => {
    expect(sanitizeSvg('<html><body>404</body></html>')).toBeNull();
    expect(sanitizeSvg('not xml at all')).toBeNull();
    expect(
      sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>'),
    ).toBeNull();
  });
});

describe('downloadIconSet', () => {
  it('Iconify: one request per chunk, picks the first known name per meaning', async () => {
    const fetcher = vi.fn((url: string) => {
      expect(url).toMatch(/^https:\/\/api\.iconify\.design\/mdi\.json\?icons=/);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            prefix: 'mdi',
            width: 24,
            height: 24,
            icons: {
              magnify: { body: '<path d="M1 1h5v5z"/>' },
              home: { body: '<path d="M2 2h5v5z"/>' },
            },
            aliases: { house: { parent: 'home' } },
          }),
        ),
      );
    });
    const result = await downloadIconSet({ kind: 'iconify', prefix: 'mdi' }, { fetcher });
    expect(result.found).toBe(2);
    expect(result.icons.search).toContain('M1 1h5v5z');
    expect(result.icons.home).toContain('viewBox="0 0 24 24"');
    expect(result.icons.menu).toBeUndefined();
  });

  it('Iconify: finds numbered names (Hugeicons: search-01, cancel-01)', async () => {
    const fetcher = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            prefix: 'hugeicons',
            icons: {
              'search-01': { body: '<path d="M1 1h5v5z"/>' },
              'cancel-01': { body: '<path d="M2 2h5v5z"/>' },
            },
          }),
        ),
      );
    const result = await downloadIconSet({ kind: 'iconify', prefix: 'hugeicons' }, { fetcher });
    expect(Object.keys(result.icons).sort()).toEqual(['close', 'search']);
  });

  it('Iconify: explains being offline', async () => {
    const fetcher = () => Promise.reject(new TypeError('Failed to fetch'));
    await expect(downloadIconSet({ kind: 'iconify', prefix: 'mdi' }, { fetcher })).rejects.toThrow(
      /Couldn't reach Iconify/,
    );
  });

  it('Iconify: explains an unknown set', async () => {
    const fetcher = () => Promise.resolve(new Response('404', { status: 404 }));
    await expect(downloadIconSet({ kind: 'iconify', prefix: 'nope' }, { fetcher })).rejects.toThrow(
      /no icon set called "nope"/,
    );
  });

  it('CDN link: tries the usual names until one exists', async () => {
    const asked: string[] = [];
    const fetcher = (url: string) => {
      asked.push(url);
      return url.endsWith('/magnifying-glass.svg') || url.endsWith('/house.svg')
        ? respond(SQUARE)
        : respond('Not found', 404);
    };
    const result = await downloadIconSet(
      { kind: 'template', url: 'https://cdn.example.com/icons/{name}.svg' },
      { fetcher },
    );
    expect(result.found).toBe(2);
    expect(Object.keys(result.icons).sort()).toEqual(['home', 'search']);
    // Stops at the first hit: "search" first, then "magnifying-glass".
    expect(asked.filter((u) => /\/(search|magnifying-glass|magnify)\.svg$/.test(u))).toEqual([
      'https://cdn.example.com/icons/search.svg',
      'https://cdn.example.com/icons/magnifying-glass.svg',
    ]);
  });

  it('CDN link: a blocked or empty source is an error, not an empty set', async () => {
    await expect(
      downloadIconSet(
        { kind: 'template', url: 'https://cdn.example.com/{name}.svg' },
        { fetcher: () => Promise.reject(new TypeError('Failed to fetch')) },
      ),
    ).rejects.toThrow(/CDN may not allow/);
    await expect(
      downloadIconSet(
        { kind: 'template', url: 'https://cdn.example.com/{name}.svg' },
        { fetcher: () => respond('Not found', 404) },
      ),
    ).rejects.toThrow(/No usable icons/);
  });

  it('has candidate names for every meaning, starting with Toonify’s own name', () => {
    for (const meaning of ICON_MEANINGS) expect(CANDIDATE_NAMES[meaning].length).toBeGreaterThan(0);
    expect(CANDIDATE_NAMES.search[0]).toBe('search');
  });
});

describe('saved custom sets', () => {
  const site = 'example.com' as SiteKey;
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('saves with a unique id, lists, and removes (sites using it go back to original)', async () => {
    const source = { kind: 'iconify', prefix: 'mdi' } as const;
    const result = { icons: { search: SQUARE }, found: 1 };
    const first = await saveCustomIconSet('My icons', source, result);
    const second = await saveCustomIconSet('My icons', source, result);
    expect(first).toBe('custom:my-icons');
    expect(second).toBe('custom:my-icons-2');
    expect((await getCustomIconSets()).map((set) => set.name)).toEqual(['My icons', 'My icons']);

    await setSiteEnabled(site, true);
    await setSiteIcons(site, { set: first, look: 'cartoon' });
    expect((await getSettings()).sites[site]?.iconSet).toBe('custom:my-icons');

    await removeCustomIconSet('my-icons');
    expect((await getCustomIconSets()).map((set) => set.id)).toEqual(['my-icons-2']);
    expect((await getSettings()).sites[site]).toEqual({ enabled: true, iconLook: 'cartoon' });
  });

  it('drops malformed stored data', () => {
    expect(parseCustomIconSets('nope')).toEqual([]);
    expect(
      parseCustomIconSets([
        {
          id: 'ok',
          name: 'OK',
          source: 'iconify:mdi',
          icons: { search: SQUARE, menu: 'javascript:x', bogus: SQUARE },
        },
        { id: 'BAD ID', name: 'x', source: 'x', icons: {} },
      ]),
    ).toEqual([
      { id: 'ok', name: 'OK', source: 'iconify:mdi', icons: { search: SQUARE }, addedAt: 0 },
    ]);
  });
});

describe('buildIconsCss with a custom set', () => {
  const url = (path: string) => `chrome-extension://abc${path}`;
  const custom = {
    id: 'mine',
    name: 'Mine',
    source: 'iconify:mdi',
    icons: { search: SQUARE },
    addedAt: 0,
  };

  it('swaps only the meanings the set has; the rest keep their drawing', () => {
    const css = buildIconsCss({ set: 'custom:mine', look: 'plain' }, url, custom);
    expect(css).toContain(`[${ICON_MARK}="search"] { --toonify-icon: url("data:image/svg+xml,`);
    expect(css).not.toContain(`[${ICON_MARK}="menu"] { --toonify-icon`);
    expect(css).toContain(`[${ICON_MARK}]:is([${ICON_MARK}="search"])`);
  });

  it('draws looks into the custom icon too', () => {
    const css = buildIconsCss({ set: 'custom:mine', look: 'sketch' }, url, custom);
    expect(decodeURIComponent(css)).toContain('feDisplacementMap');
  });

  it('a missing or blocked custom set swaps nothing (site icons stay)', () => {
    expect(buildIconsCss({ set: 'custom:gone', look: 'plain' }, url, null)).not.toContain(
      '--toonify-icon',
    );
    expect(buildIconsCss({ set: 'custom:mine', look: 'plain' }, url, null)).not.toContain('mask');
  });
});
