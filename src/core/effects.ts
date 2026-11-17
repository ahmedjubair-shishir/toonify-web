/**
 * Optional effects the user switches on per site (popup > Effects;
 * Figma: Popup > Quick effects). All are live CSS/SVG on the device,
 * reversible, and add no permissions. Default: all off.
 */
export interface EffectInfo {
  id: EffectId;
  label: string;
  description: string;
}

export const EFFECT_IDS = ['sketch', 'sticker', 'bouncy', 'headings', 'texture'] as const;
export type EffectId = (typeof EFFECT_IDS)[number];
export type Effects = Readonly<Record<EffectId, boolean>>;

export const EFFECTS: readonly EffectInfo[] = [
  {
    id: 'sketch',
    label: 'Hand-drawn lines',
    description: 'Sketchy outlines and wavy link underlines',
  },
  { id: 'sticker', label: 'Sticker photos', description: 'White border, slight tilt, soft shadow' },
  { id: 'bouncy', label: 'Bouncy buttons', description: 'Squash and bounce on hover and click' },
  { id: 'headings', label: 'Playful headings', description: 'Rounded cartoon font for headings' },
  { id: 'texture', label: 'Comic background', description: 'Dots, paper or grid, by style' },
];

export const NO_EFFECTS: Effects = {
  sketch: false,
  sticker: false,
  bouncy: false,
  headings: false,
  texture: false,
};

export const isEffectId = (value: unknown): value is EffectId =>
  typeof value === 'string' && (EFFECT_IDS as readonly string[]).includes(value);

/** Keeps known effect switches that are true/false; drops anything else. */
export function parseEffects(raw: unknown): Partial<Record<EffectId, boolean>> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const result: Partial<Record<EffectId, boolean>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isEffectId(key) && typeof value === 'boolean') result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export const resolveEffects = (
  stored: Partial<Record<EffectId, boolean>> | undefined,
): Effects => ({
  ...NO_EFFECTS,
  ...stored,
});
