/**
 * A theme is plain data. The engine (src/content/theme-css.ts) turns it into
 * CSS, so adding a style means adding a file like classic-cartoon.ts, not
 * changing engine code (spec 4.1: "presets as configuration").
 */

/** A shadow drawn in the ink colour. blur 0 = hard, cartoon-style edge. */
export interface InkShadow {
  x: number;
  y: number;
  blur: number;
}

/**
 * Redraws content images in the style, on the device, with the browser's
 * built-in SVG filters (no pixels are read or uploaded).
 */
export interface CartoonFilter {
  /** Blur before flattening, in px: removes photo noise. */
  smooth: number;
  /** Colour bands per channel (fewer = flatter). 2 to 16. */
  levels: number;
  /** How much of the flattened colour to use, 0 to 1 (the rest is the original, smoothed). */
  flatten: number;
  /** Ink line strength (0 = no lines). */
  edge: number;
  /** Edges weaker than this are ignored (stops textures turning into scribbles). */
  threshold: number;
  /** Extra line thickness in px (0 = thin lines). */
  edgeWidth: number;
}

export interface ThemeTokens {
  id: string;
  name: string;
  /** One short line for the picker. */
  description: string;
  /**
   * Line colour strength, as % of each element's own text colour. Using the
   * element's text colour keeps lines dark on light sites and light on dark
   * sites without guessing the site's colour scheme.
   */
  inkStrength: number;
  /** Line thickness in px. */
  line: { media: number; button: number; field: number };
  /** Corner radius in px. */
  radius: { media: number; button: number; field: number };
  /** Shadow under text buttons, or null for none. */
  buttonShadow: InkShadow | null;
  /** Shadow behind content images, or null for none. */
  mediaShadow: InkShadow | null;
  /** Image redraw recipe, or null to keep the picture itself unchanged. */
  cartoon: CartoonFilter | null;
  /** Colour treatment for content images, after the redraw (1 / 0 = unchanged). */
  media: { saturate: number; contrast: number; sepia: number };
}
