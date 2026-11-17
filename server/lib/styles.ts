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
};

export const isStyleId = (value: unknown): value is string =>
  typeof value === 'string' && Object.hasOwn(STYLE_PROMPTS, value);
