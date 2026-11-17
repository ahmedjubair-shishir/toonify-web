import type { CartoonFilter } from '@/core/themes';

/**
 * Builds the hidden <svg> holding the image redraw filter. CSS then applies
 * it to marked images with `filter: url(#toonify-web-cartoon)`.
 *
 * Pipeline (all done by the browser while drawing, nothing is read or sent):
 *   1. smooth:  slight blur removes photo noise
 *   2. flatten: each colour channel snaps to a few bands (cartoon fills),
 *               mixed with the smoothed original so bands stay gentle
 *   3. ink:     edge detection on a softer grey copy; weak edges (texture)
 *               are dropped, the rest become dark lines
 *   4. combine: lines multiplied over the colours, original transparency kept
 *
 * Built with createElementNS, never innerHTML, so it also works on sites
 * that restrict HTML injection (Trusted Types).
 */

export const FILTER_ELEMENT_ID = 'toonify-web-filters';
export const CARTOON_FILTER_ID = 'toonify-web-cartoon';
export const SKETCH_FILTER_ID = 'toonify-web-sketch';
export const ICON_SKETCH_FILTER_ID = 'toonify-web-icon-sketch';

/** Filters a page needs: the image redraw (paused) and the hand-drawn wobbles. */
export interface FilterSet {
  cartoon: CartoonFilter | null;
  sketch: boolean;
  /** Finer wobble sized for small icons (icon look "Sketched"). */
  iconSketch?: boolean;
}

export const NO_FILTERS: FilterSet = { cartoon: null, sketch: false };
export const hasFilters = (filters: FilterSet) =>
  filters.cartoon !== null || filters.sketch || filters.iconSketch === true;

const SVG = 'http://www.w3.org/2000/svg';

type Attributes = Record<string, string | number>;

const round = (value: number) => +value.toFixed(4);

function el(doc: Document, name: string, attributes: Attributes, children: Element[] = []) {
  const node = doc.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  node.append(...children);
  return node;
}

/**
 * Band values at the middle of each band, e.g. levels 4 -> "0.125 0.375 0.625 0.875".
 * Midpoints keep dark and light detail instead of crushing them to black/white.
 */
export function bands(levels: number): string {
  const n = Math.min(16, Math.max(2, Math.round(levels)));
  return Array.from({ length: n }, (_, i) => +((i + 0.5) / n).toFixed(3)).join(' ');
}

/** Stable text form of the filters, to tell whether the element must change. */
export const filterKey = ({ cartoon, sketch, iconSketch }: FilterSet) =>
  `${cartoon === null ? '' : Object.values(cartoon).join('|')}/${sketch ? 'sketch' : ''}/${iconSketch ? 'icon' : ''}`;

/**
 * Hand-drawn wobble: a soft noise field nudges each pixel by a couple of px,
 * so straight outlines look drawn by hand. Same noise every time (fixed seed),
 * so nothing shimmers.
 */
function sketchFilterNode(doc: Document): Element {
  return el(
    doc,
    'filter',
    { id: SKETCH_FILTER_ID, x: '-3%', y: '-3%', width: '106%', height: '106%' },
    [
      el(doc, 'feTurbulence', {
        type: 'fractalNoise',
        baseFrequency: 0.035,
        numOctaves: 2,
        seed: 7,
        result: 'noise',
      }),
      el(doc, 'feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'noise',
        scale: 3,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
      }),
    ],
  );
}

/** The same idea at icon scale: finer noise, smaller nudge, so icons stay readable. */
function iconSketchFilterNode(doc: Document): Element {
  return el(
    doc,
    'filter',
    { id: ICON_SKETCH_FILTER_ID, x: '-15%', y: '-15%', width: '130%', height: '130%' },
    [
      el(doc, 'feTurbulence', {
        type: 'fractalNoise',
        baseFrequency: 0.22,
        numOctaves: 1,
        seed: 3,
        result: 'noise',
      }),
      el(doc, 'feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'noise',
        scale: 2.6,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
      }),
    ],
  );
}

function cartoonFilterNode(doc: Document, filter: CartoonFilter): Element {
  const funcs = (type: string, attrs: Attributes) =>
    ['feFuncR', 'feFuncG', 'feFuncB'].map((name) => el(doc, name, { type, ...attrs }));

  const steps: Element[] = [
    // edgeMode duplicate: blur repeats border pixels instead of fading into
    // transparency, which would otherwise draw a fake ink frame round images.
    el(doc, 'feGaussianBlur', {
      in: 'SourceGraphic',
      stdDeviation: filter.smooth,
      edgeMode: 'duplicate',
      result: 'soft',
    }),
    el(
      doc,
      'feComponentTransfer',
      { in: 'soft', result: 'poster' },
      funcs('discrete', { tableValues: bands(filter.levels) }),
    ),
    // flat = flatten * poster + (1 - flatten) * soft
    el(doc, 'feComposite', {
      in: 'poster',
      in2: 'soft',
      operator: 'arithmetic',
      k1: 0,
      k2: round(filter.flatten),
      k3: round(1 - filter.flatten),
      k4: 0,
      result: 'flat',
    }),
  ];

  if (filter.edge > 0) {
    steps.push(
      // Softer copy for edges, so fine texture doesn't count as an edge.
      el(doc, 'feGaussianBlur', {
        in: 'SourceGraphic',
        stdDeviation: round(filter.smooth * 2.2),
        edgeMode: 'duplicate',
        result: 'edgeSoft',
      }),
      // Grey copy (luma weights), alpha kept.
      el(doc, 'feColorMatrix', {
        in: 'edgeSoft',
        type: 'matrix',
        values: '0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0',
        result: 'grey',
      }),
      // Edge detection: bright where brightness changes.
      el(doc, 'feConvolveMatrix', {
        in: 'grey',
        order: 3,
        kernelMatrix: '-1 -1 -1 -1 8 -1 -1 -1 -1',
        preserveAlpha: 'true',
        result: 'edges',
      }),
      // ink = 1 - strength * (edge - threshold): white paper, dark lines, and
      // anything below the threshold stays white.
      el(
        doc,
        'feComponentTransfer',
        { in: 'edges', result: 'ink' },
        funcs('linear', {
          slope: -filter.edge,
          intercept: round(1 + filter.edge * filter.threshold),
        }),
      ),
    );
    let inkResult = 'ink';
    if (filter.edgeWidth > 0) {
      // Erode spreads the dark lines (min of neighbours) = thicker ink.
      steps.push(
        el(doc, 'feMorphology', {
          in: 'ink',
          operator: 'erode',
          radius: filter.edgeWidth,
          result: 'thick',
        }),
      );
      inkResult = 'thick';
    }
    // Outside the picture is transparent, which edge steps see as a "change",
    // so they would draw a fake frame. Keep ink only inside a slightly shrunk
    // copy of the picture's shape; near the border the paper stays white.
    const margin = Math.ceil(filter.smooth * 2.2 * 2 + filter.edgeWidth) + 1;
    steps.push(
      el(doc, 'feMorphology', {
        in: 'SourceAlpha',
        operator: 'erode',
        radius: margin,
        result: 'inner',
      }),
      el(doc, 'feComposite', { in: inkResult, in2: 'inner', operator: 'in', result: 'innerInk' }),
      el(doc, 'feFlood', { 'flood-color': '#ffffff', 'flood-opacity': 1, result: 'paper' }),
      el(doc, 'feComposite', {
        in: 'innerInk',
        in2: 'paper',
        operator: 'over',
        result: 'cleanInk',
      }),
      el(doc, 'feBlend', { in: 'flat', in2: 'cleanInk', mode: 'multiply', result: 'drawn' }),
    );
  }

  // Keep the original image's transparency (logos, cut-outs).
  steps.push(
    el(doc, 'feComposite', {
      in: filter.edge > 0 ? 'drawn' : 'flat',
      in2: 'SourceGraphic',
      operator: 'in',
    }),
  );

  return el(
    doc,
    'filter',
    {
      id: CARTOON_FILTER_ID,
      'color-interpolation-filters': 'sRGB',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    steps,
  );
}

export function createFilterElement(doc: Document, filters: FilterSet): SVGSVGElement {
  const nodes: Element[] = [];
  if (filters.cartoon !== null) nodes.push(cartoonFilterNode(doc, filters.cartoon));
  if (filters.sketch) nodes.push(sketchFilterNode(doc));
  if (filters.iconSketch) nodes.push(iconSketchFilterNode(doc));
  const svg = el(
    doc,
    'svg',
    {
      id: FILTER_ELEMENT_ID,
      'aria-hidden': 'true',
      focusable: 'false',
      width: 0,
      height: 0,
      // Takes no space and never catches clicks; not display:none, which can
      // disable the filter in some browsers.
      style: 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none',
      'data-key': filterKey(filters),
    },
    [el(doc, 'defs', {}, nodes)],
  );
  return svg as SVGSVGElement;
}
