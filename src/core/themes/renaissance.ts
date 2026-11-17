import type { ThemeTokens } from './types';

/** Museum-portrait treatment (descriptive name, spec 4.1): gilded photo frames, warm varnished colour. */
export const renaissance: ThemeTokens = {
  id: 'renaissance',
  name: 'Renaissance Painting',
  description: 'Gold frames, warm varnish',
  inkStrength: 70,
  ink: '#3b2a1a',
  frame: '#b08d3c',
  line: { media: 6, button: 2, field: 1.5 },
  radius: { media: 2, button: 8, field: 6 },
  buttonShadow: { x: 0, y: 3, blur: 8 },
  mediaShadow: { x: 0, y: 12, blur: 28 },
  cartoon: null,
  texture: 'canvas',
  media: { saturate: 0.9, contrast: 1.1, sepia: 0.3, brightness: 0.97 },
};
