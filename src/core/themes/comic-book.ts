import type { ThemeTokens } from './types';

/** Expressive pages: heavy ink, squarer panels, hard offset shadows, punchy colour. */
export const comicBook: ThemeTokens = {
  id: 'comic-book',
  name: 'Comic Book',
  description: 'Ink outlines, bold contrast',
  inkStrength: 100,
  line: { media: 4, button: 3, field: 2 },
  radius: { media: 4, button: 6, field: 4 },
  buttonShadow: { x: 3, y: 3, blur: 0 },
  mediaShadow: { x: 6, y: 6, blur: 0 },
  cartoon: { smooth: 1.2, levels: 5, flatten: 0.65, edge: 11, threshold: 0.045, edgeWidth: 0.6 },
  media: { saturate: 1.3, contrast: 1.12, sepia: 0 },
};
