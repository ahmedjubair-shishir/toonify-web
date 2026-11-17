import { describe, expect, it } from 'vitest';
import { originsForSite, siteKeyFromOrigin, siteKeyFromUrl, type SiteKey } from '@/core/site';

describe('siteKeyFromUrl', () => {
  it.each([
    ['https://www.wikipedia.org/wiki/Bangladesh', 'wikipedia.org'],
    ['https://wikipedia.org/', 'wikipedia.org'],
    ['https://bn.wikipedia.org/wiki/', 'bn.wikipedia.org'],
    ['http://LOCALHOST:4173/static.html', 'localhost'],
    ['https://192.168.0.10/admin', '192.168.0.10'],
    ['chrome://settings', null],
    ['file:///C:/notes.html', null],
    ['not a url', null],
    [undefined, null],
  ] as const)('%s -> %s', (url, expected) => {
    expect(siteKeyFromUrl(url)).toBe(expected);
  });
});

describe('originsForSite', () => {
  it('covers the bare and www host for normal domains', () => {
    expect(originsForSite('wikipedia.org' as SiteKey)).toEqual([
      '*://wikipedia.org/*',
      '*://www.wikipedia.org/*',
    ]);
  });

  it('does not invent www for localhost or IP addresses', () => {
    expect(originsForSite('localhost' as SiteKey)).toEqual(['*://localhost/*']);
    expect(originsForSite('10.0.0.1' as SiteKey)).toEqual(['*://10.0.0.1/*']);
  });

  it('round-trips through siteKeyFromOrigin', () => {
    for (const origin of originsForSite('example.com' as SiteKey)) {
      expect(siteKeyFromOrigin(origin)).toBe('example.com');
    }
  });

  it('ignores broad or foreign patterns', () => {
    expect(siteKeyFromOrigin('*://*/*')).toBeNull();
    expect(siteKeyFromOrigin('https://*.example.com/*')).toBeNull();
    expect(siteKeyFromOrigin('<all_urls>')).toBeNull();
    expect(siteKeyFromOrigin('http://localhost/*')).toBe('localhost');
  });
});
