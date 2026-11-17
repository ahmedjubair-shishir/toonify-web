import type { ThemeTokens } from './types';

/** Reading and browsing: light lines, very round, soft shadows, warm paper-like images. */
export const storybook: ThemeTokens = {
  id: 'storybook',
  name: 'Storybook',
  description: 'Soft colours, gentle edges',
  inkStrength: 40,
  line: { media: 2, button: 1.5, field: 1.5 },
  radius: { media: 22, button: 18, field: 14 },
  buttonShadow: { x: 0, y: 4, blur: 10 },
  mediaShadow: { x: 0, y: 8, blur: 20 },
  // Filter redraw is off (owner feedback: not nice enough); the real redraw
  // will be the on-click AI "Cartoonize". Recipe kept for an optional effect:
  // { smooth: 1.6, levels: 9, flatten: 0.45, edge: 3.5, threshold: 0.06, edgeWidth: 0 }
  cartoon: null,
  texture: 'paper',
  media: { saturate: 0.9, contrast: 0.97, sepia: 0.15 },
};
