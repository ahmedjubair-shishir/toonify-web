import type { ThemeTokens } from './types';

/** Default look (spec 4): clean outlines, rounded forms, gentle shadows. */
export const classicCartoon: ThemeTokens = {
  id: 'classic-cartoon',
  name: 'Classic Cartoon',
  description: 'Clean outlines, soft shadows',
  inkStrength: 85,
  line: { media: 3, button: 2, field: 2 },
  radius: { media: 16, button: 12, field: 10 },
  buttonShadow: { x: 0, y: 3, blur: 0 },
  mediaShadow: null,
  cartoon: { smooth: 1, levels: 7, flatten: 0.5, edge: 7, threshold: 0.05, edgeWidth: 0 },
  media: { saturate: 1.15, contrast: 1.05, sepia: 0 },
};
