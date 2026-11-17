/** Aspect ratios Gemini image models accept (response_format.aspect_ratio). */
export const ASPECT_RATIOS = [
  '1:1',
  '3:2',
  '2:3',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
] as const;

/** Closest supported ratio, so the cartoon fits where the photo was. */
export function nearestAspectRatio(width: number, height: number): (typeof ASPECT_RATIOS)[number] {
  if (!(width > 0 && height > 0)) return '1:1';
  const target = Math.log(width / height);
  let best: (typeof ASPECT_RATIOS)[number] = '1:1';
  let bestDistance = Infinity;
  for (const ratio of ASPECT_RATIOS) {
    const [w, h] = ratio.split(':').map(Number) as [number, number];
    const distance = Math.abs(Math.log(w / h) - target);
    if (distance < bestDistance) {
      best = ratio;
      bestDistance = distance;
    }
  }
  return best;
}
