import type { ThemeTokens } from './types';

/** Calm visual treatment: soft, light lines, very round shapes, washed colours. */
export const watercolor: ThemeTokens = {
  id: 'watercolor',
  name: 'Watercolor',
  description: 'Soft edges, blended colours',
  inkStrength: 30,
  line: { media: 1.5, button: 1.5, field: 1 },
  radius: { media: 24, button: 20, field: 14 },
  buttonShadow: { x: 0, y: 3, blur: 12 },
  mediaShadow: { x: 0, y: 6, blur: 18 },
  // Filter redraw paused (see classic-cartoon.ts).
  cartoon: null,
  texture: 'paper',
  media: { saturate: 1.1, contrast: 0.92, sepia: 0.05, brightness: 1.05 },
};
