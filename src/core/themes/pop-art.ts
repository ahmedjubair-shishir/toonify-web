import type { ThemeTokens } from './types';

/** High-energy look: thick ink, square blocks, big hard shadows, loud colour. */
export const popArt: ThemeTokens = {
  id: 'pop-art',
  name: 'Pop Art',
  description: 'Bold blocks, big dots',
  inkStrength: 100,
  line: { media: 4, button: 3, field: 3 },
  radius: { media: 0, button: 4, field: 2 },
  buttonShadow: { x: 5, y: 5, blur: 0 },
  mediaShadow: { x: 8, y: 8, blur: 0 },
  cartoon: null,
  texture: 'pop',
  media: { saturate: 1.8, contrast: 1.25, sepia: 0 },
};
