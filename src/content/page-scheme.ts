import { SCHEME_ATTRIBUTE } from './toonify-layer';

/** Parses "rgb(...)" / "rgba(...)" into [r, g, b, a] (0-255, alpha 0-1). */
export function parseRgb(value: string): [number, number, number, number] | null {
  const match = /rgba?\(([^)]+)\)/.exec(value);
  if (!match?.[1]) return null;
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  const [r = 0, g = 0, b = 0, a = 1] = parts;
  return [r, g, b, a];
}

/** Relative luminance (WCAG) of an sRGB colour, 0 = black, 1 = white. */
export function luminance([r, g, b]: [number, number, number, number]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Light or dark page? Looks at the first visible background of <body>, then
 * <html> (browsers paint white when both are transparent). Used so effect
 * ink is dark on light pages and light on dark pages.
 */
export function detectScheme(doc: Document): 'light' | 'dark' {
  const view = doc.defaultView;
  if (!view) return 'light';
  for (const element of [doc.body, doc.documentElement]) {
    if (!element) continue;
    const colour = parseRgb(view.getComputedStyle(element).backgroundColor);
    if (colour && colour[3] > 0.5) return luminance(colour) < 0.35 ? 'dark' : 'light';
  }
  return 'light';
}

export function applyScheme(doc: Document): void {
  doc.documentElement.setAttribute(SCHEME_ATTRIBUTE, detectScheme(doc));
}
