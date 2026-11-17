import { isIP } from 'node:net';

/**
 * The server downloads images by URL, so it must never be tricked into
 * fetching internal addresses (cloud metadata, localhost, private networks).
 * This is "SSRF" protection: only public http(s) addresses are allowed, and
 * every address a hostname resolves to is checked, on every redirect.
 */

export type Lookup = (hostname: string) => Promise<string[]>;

function ipv4Private(ip: string): boolean {
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4Private(ip);
  if (version === 6) {
    const lower = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped?.[1]) return ipv4Private(mapped[1]);
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') || // unique local
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb') || // link-local
      lower.startsWith('ff') // multicast
    );
  }
  return true; // not an IP at all: treat as unsafe
}

export class UnsafeUrlError extends Error {}

/** Throws UnsafeUrlError unless the URL is public http(s). */
export async function assertPublicUrl(raw: string, lookup: Lookup): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('Not a valid address');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new UnsafeUrlError('Only http and https images can be cartoonized');
  }
  if (url.username || url.password)
    throw new UnsafeUrlError('Addresses with passwords are not allowed');
  if (url.port && url.port !== '80' && url.port !== '443')
    throw new UnsafeUrlError('Unusual ports are not allowed');

  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : await lookup(host).catch(() => []);
  if (addresses.length === 0) throw new UnsafeUrlError('Address could not be found');
  if (addresses.some(isPrivateAddress))
    throw new UnsafeUrlError('Private addresses are not allowed');
  return url;
}
