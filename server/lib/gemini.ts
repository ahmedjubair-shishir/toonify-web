/**
 * Calls the Gemini Interactions API to redraw one image.
 * Request shape per Google's image-generation docs (Interactions API):
 *   POST /v1beta/interactions  { model, input: [text, image], response_format }
 * The output image is the last image block of the last "model_output" step.
 */

export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite-image';

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface RedrawRequest {
  apiKey: string;
  model: string;
  prompt: string;
  image: Uint8Array;
  mimeType: string;
  aspectRatio: string;
  fetchImpl?: typeof fetch;
}

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

type Block = { type?: string; data?: string; mime_type?: string };
type Step = { type?: string; content?: Block[] };

/** Finds the generated image in a response, or null (e.g. blocked by safety). */
export function extractImage(body: unknown): { data: string; mimeType: string } | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as { output_image?: Block; steps?: Step[] };
  if (record.output_image?.data) {
    return {
      data: record.output_image.data,
      mimeType: record.output_image.mime_type ?? 'image/jpeg',
    };
  }
  const steps = Array.isArray(record.steps) ? record.steps : [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step?.type !== 'model_output' || !Array.isArray(step.content)) continue;
    for (let j = step.content.length - 1; j >= 0; j--) {
      const block = step.content[j];
      if (block?.type === 'image' && typeof block.data === 'string' && block.data.length > 0) {
        return { data: block.data, mimeType: block.mime_type ?? 'image/jpeg' };
      }
    }
  }
  return null;
}

export async function redrawImage(
  request: RedrawRequest,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const { fetchImpl = fetch } = request;
  const response = await fetchImpl(GEMINI_ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': request.apiKey,
    },
    body: JSON.stringify({
      model: request.model,
      input: [
        { type: 'text', text: request.prompt },
        { type: 'image', mime_type: request.mimeType, data: toBase64(request.image) },
      ],
      response_format: {
        type: 'image',
        mime_type: 'image/jpeg',
        aspect_ratio: request.aspectRatio,
        image_size: '1K',
      },
    }),
  });

  if (!response.ok) {
    // Never pass Google's error text to users: it can include request details.
    throw new ProviderError(`Gemini request failed (${response.status})`, response.status);
  }
  const image = extractImage(await response.json().catch(() => null));
  if (image === null)
    throw new ProviderError('Gemini returned no image (it may have declined this picture)', 422);
  return { bytes: new Uint8Array(Buffer.from(image.data, 'base64')), mimeType: image.mimeType };
}
