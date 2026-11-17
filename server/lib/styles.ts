/**
 * One instruction per Toonify style (ids match src/core/themes). Every prompt
 * asks to keep the picture's content and framing, so the page still makes
 * sense, and to add no text (no fake captions or signatures).
 */
const KEEP =
  'Keep the same subjects, composition, poses, framing and aspect ratio. Do not add, remove or rename anything. Do not add any text, letters, logos or signatures.';

export const STYLE_PROMPTS: Readonly<Record<string, string>> = {
  'classic-cartoon': `Redraw this image as a clean, friendly classic cartoon illustration: smooth confident outlines, simplified flat colours with soft cel shading, rounded shapes, bright but natural palette. ${KEEP}`,
  'comic-book': `Redraw this image as a comic book panel: bold black ink outlines, strong contrast, halftone dot shading in the shadows, vivid saturated colours, dramatic comic-style lighting. ${KEEP}`,
  storybook: `Redraw this image as a gentle children's storybook illustration: soft watercolour-like colours, light pencil linework, warm paper texture, calm cosy mood. ${KEEP}`,
  watercolor: `Redraw this image as a soft watercolour painting: blended washes of colour, gentle bleeding edges, light paper showing through, delicate details. ${KEEP}`,
  'pencil-sketch': `Redraw this image as a graphite pencil sketch: expressive hand-drawn lines, cross-hatched shading, muted grey tones on white paper. ${KEEP}`,
  'pop-art': `Redraw this image in bold pop art style: thick black outlines, flat bright primary colours, large Ben-Day halftone dots, high contrast. ${KEEP}`,
  'oil-painting': `Redraw this image as a classic oil painting: rich saturated colours, visible confident brush strokes, deep soft shadows, canvas texture. ${KEEP}`,
  'vintage-poster': `Redraw this image as a vintage travel poster: limited faded colour palette, flat shapes, bold simple forms, aged printed-paper texture. ${KEEP}`,
  'cel-shaded': `Redraw this image in cel-shaded animation style: crisp clean outlines, flat colour regions with hard-edged shadows, vivid anime-like palette. ${KEEP}`,
  'monochrome-ink': `Redraw this image as a black ink drawing: bold brush and pen strokes, solid blacks, white paper, no colour. ${KEEP}`,
  renaissance: `Redraw this image as a Renaissance-era oil painting: warm varnished colours, soft chiaroscuro lighting, classical painterly detail. ${KEEP}`,
};

export const isStyleId = (value: unknown): value is string =>
  typeof value === 'string' && Object.hasOwn(STYLE_PROMPTS, value);
