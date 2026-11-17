import { isCartoonizeAvailable } from './config';

/**
 * The AI tools a user can pick for "Cartoonize" (popup > AI cartoonize).
 *
 * - account: uses the person's own Gemini / ChatGPT account (free or paid).
 *   No app may drive a consumer subscription automatically, so Toonify hands
 *   the picture over: it copies the image + style instruction and opens the
 *   AI app; the person pastes and sends. Nothing is uploaded by Toonify.
 * - api-key: automatic, in-page result with the person's own API key
 *   (coming next).
 * - server: the owner's Toonify AI server (only in builds that have one).
 */
export type AiToolKind = 'off' | 'account' | 'api-key' | 'server';

export interface AiTool {
  id: string;
  /** Short name in the picker and on the chip ("Cartoonize in Gemini"). */
  name: string;
  /** Picker label. */
  label: string;
  /** What it needs, shown as a badge. */
  needs: string;
  kind: AiToolKind;
  /** Where the account handoff opens. */
  appUrl?: string;
  /** False = shown but not selectable yet. */
  ready: boolean;
}

export const AI_TOOLS: readonly AiTool[] = [
  { id: 'off', name: 'Off', label: 'Off', needs: 'No AI', kind: 'off', ready: true },
  {
    id: 'gemini-account',
    name: 'Gemini',
    label: 'Gemini - my account',
    needs: 'Free or Pro account · you paste',
    kind: 'account',
    appUrl: 'https://gemini.google.com/app',
    ready: true,
  },
  {
    id: 'chatgpt-account',
    name: 'ChatGPT',
    label: 'ChatGPT - my account',
    needs: 'Free or Plus account · you paste',
    kind: 'account',
    appUrl: 'https://chatgpt.com/',
    ready: true,
  },
  {
    id: 'gemini-key',
    name: 'Gemini',
    label: 'Gemini - API key',
    needs: 'API key · automatic · coming soon',
    kind: 'api-key',
    ready: false,
  },
  {
    id: 'openai-key',
    name: 'ChatGPT',
    label: 'OpenAI - API key',
    needs: 'API key · automatic · coming soon',
    kind: 'api-key',
    ready: false,
  },
  {
    id: 'toonify',
    name: 'Toonify AI',
    label: 'Toonify AI',
    needs: 'No account needed',
    kind: 'server',
    ready: true,
  },
];

export const DEFAULT_AI_TOOL = 'off';

/**
 * AI cartoonize is paused (owner, 18 Nov 2026): the account handoff opens
 * another site instead of converting live, and live conversion needs a paid
 * API. The code stays; only test builds show it until it returns.
 */
export const isAiFeatureEnabled = () => import.meta.env.MODE === 'e2e';

/** Tools this build can offer (Toonify AI only when a server is configured). */
export const availableAiTools = () =>
  isAiFeatureEnabled()
    ? AI_TOOLS.filter((tool) => tool.kind !== 'server' || isCartoonizeAvailable())
    : AI_TOOLS.filter((tool) => tool.kind === 'off');

export const isAiToolId = (value: unknown): value is string =>
  typeof value === 'string' && AI_TOOLS.some((tool) => tool.id === value);

/** Unknown, not-ready or unavailable tools fall back to Off. */
export function getAiTool(id: string | undefined): AiTool {
  const tool = availableAiTools().find((t) => t.id === id && t.ready);
  return tool ?? (AI_TOOLS[0] as AiTool);
}

/**
 * Style instructions sent to the AI (ids match src/core/themes). Kept in sync
 * with server/lib/styles.ts by a unit test (the server deploys on its own).
 */
const KEEP =
  'Keep the same subjects, composition, poses, framing and aspect ratio. Do not add, remove or rename anything. Do not add any text, letters, logos or signatures.';

export const STYLE_PROMPTS: Readonly<Record<string, string>> = {
  'classic-cartoon': `Redraw this image as a clean, friendly classic cartoon illustration: smooth confident outlines, simplified flat colours with soft cel shading, rounded shapes, bright but natural palette. ${KEEP}`,
  'comic-book': `Redraw this image as a comic book panel: bold black ink outlines, strong contrast, halftone dot shading in the shadows, vivid saturated colours, dramatic comic-style lighting. ${KEEP}`,
  storybook: `Redraw this image as a gentle children's storybook illustration: soft watercolour-like colours, light pencil linework, warm paper texture, calm cosy mood. ${KEEP}`,
};

export const stylePrompt = (themeId: string) =>
  STYLE_PROMPTS[themeId] ?? (STYLE_PROMPTS['classic-cartoon'] as string);
