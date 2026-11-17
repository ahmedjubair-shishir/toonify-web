import type { ThemeTokens } from './types';

/** Decorative look: brown ink, limited faded palette, printed-paper feel. */
export const vintagePoster: ThemeTokens = {
  id: 'vintage-poster',
  name: 'Vintage Poster',
  description: 'Sepia ink, aged print',
  inkStrength: 90,
  ink: '#5a3a22',
  line: { media: 3, button: 2.5, field: 2 },
  radius: { media: 2, button: 6, field: 4 },
  buttonShadow: { x: 3, y: 3, blur: 0 },
  mediaShadow: { x: 4, y: 4, blur: 0 },
  cartoon: null,
  texture: 'newsprint',
  media: { saturate: 0.75, contrast: 1.15, sepia: 0.45 },
};
