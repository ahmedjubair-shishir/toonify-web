import type { ThemeTokens } from './types';

/** Image-focused browsing: rich saturated colour, soft deep shadows, canvas texture. */
export const oilPainting: ThemeTokens = {
  id: 'oil-painting',
  name: 'Oil Painting',
  description: 'Rich colour, deep shadows',
  inkStrength: 55,
  line: { media: 3, button: 2, field: 2 },
  radius: { media: 8, button: 10, field: 8 },
  buttonShadow: { x: 0, y: 4, blur: 10 },
  mediaShadow: { x: 0, y: 10, blur: 24 },
  cartoon: null,
  texture: 'canvas',
  media: { saturate: 1.25, contrast: 1.08, sepia: 0.1 },
};
