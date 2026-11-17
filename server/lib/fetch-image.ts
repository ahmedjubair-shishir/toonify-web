import { assertPublicUrl, UnsafeUrlError, type Lookup } from './safe-url';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
/** Raster formats only: no SVG (can contain scripts) and no animated GIF. */
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class ImageFetchError extends Error {}

export interface FetchedImage {
  bytes: Uint8Array;
  mimeType: string;
}

/**
 * Downloads a public image safely: every redirect is re-checked, the type
 * must be a real raster image, and the size is capped while reading (a
 * server can lie about Content-Length).
 */
export async function fetchPublicImage(
  raw: string,
  { fetchImpl = fetch, lookup }: { fetchImpl?: typeof fetch; lookup: Lookup },
): Promise<FetchedImage> {
  let address = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(address, lookup);
    const response = await fetchImpl(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'image/jpeg,image/png,image/webp' },
    });

    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      if (!next) throw new ImageFetchError('Broken redirect');
      address = new URL(next, url).toString();
      continue;
    }
    if (!response.ok)
      throw new ImageFetchError(`The image could not be downloaded (${response.status})`);

    const mimeType =
      (response.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!ACCEPTED.has(mimeType))
      throw new ImageFetchError('Only JPEG, PNG and WebP images are supported');
    if (Number(response.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES) {
      throw new ImageFetchError('The image is too large');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new ImageFetchError('The image was empty');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new ImageFetchError('The image is too large');
      }
      chunks.push(value);
    }
    if (size === 0) throw new ImageFetchError('The image was empty');
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, mimeType };
  }
  throw new UnsafeUrlError('Too many redirects');
}
