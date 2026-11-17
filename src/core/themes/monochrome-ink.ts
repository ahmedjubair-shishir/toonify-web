import type { ThemeTokens } from './types';

/** Low-colour mode: black ink, square corners, greyscale high-contrast photos. */
export const monochromeInk: ThemeTokens = {
  id: 'monochrome-ink',
  name: 'Monochrome Ink',
  description: 'Black ink, no colour',
  inkStrength: 100,
  ink: '#111111',
  line: { media: 3, button: 2, field: 2 },
  radius: { media: 0, button: 2, field: 0 },
  buttonShadow: { x: 3, y: 3, blur: 0 },
  mediaShadow: { x: 6, y: 6, blur: 0 },
  cartoon: null,
  texture: 'halftone',
  media: { saturate: 0, contrast: 1.35, sepia: 0, grayscale: 1 },
};
