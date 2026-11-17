import type { ThemeTokens } from './types';

/** Minimal, artistic look: thin graphite lines, near-greyscale photos, no shadows. */
export const pencilSketch: ThemeTokens = {
  id: 'pencil-sketch',
  name: 'Pencil Sketch',
  description: 'Graphite lines, muted colour',
  inkStrength: 75,
  ink: '#4a4a52',
  line: { media: 1.5, button: 1.5, field: 1.5 },
  radius: { media: 6, button: 6, field: 4 },
  buttonShadow: null,
  mediaShadow: null,
  cartoon: null,
  texture: 'paper',
  media: { saturate: 0.6, contrast: 1.15, sepia: 0, grayscale: 0.7, brightness: 1.05 },
};
