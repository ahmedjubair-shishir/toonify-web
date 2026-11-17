import type { ThemeTokens } from './types';

/** Game/anime-inspired: crisp full-strength outlines, punchy flat colour. */
export const celShaded: ThemeTokens = {
  id: 'cel-shaded',
  name: 'Cel-Shaded',
  description: 'Flat colour, crisp edges',
  inkStrength: 100,
  line: { media: 3, button: 2.5, field: 2 },
  radius: { media: 12, button: 14, field: 10 },
  buttonShadow: { x: 0, y: 4, blur: 0 },
  mediaShadow: null,
  cartoon: null,
  texture: 'halftone',
  media: { saturate: 1.45, contrast: 1.2, sepia: 0, brightness: 1.03 },
};
