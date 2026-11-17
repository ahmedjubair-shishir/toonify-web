import { inflateSync } from 'node:zlib';

/**
 * Minimal PNG reader for test screenshots (8-bit RGB/RGBA, not interlaced,
 * which is what Chromium produces). Returns RGBA pixels. Avoids adding an
 * image library just for tests.
 */
export function decodePng(png: Buffer): { width: number; height: number; rgba: Uint8Array } {
  let offset = 8; // signature
  let width = 0;
  let height = 0;
  let colourType = 0;
  const idat: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('unsupported PNG');
      colourType = data[9] ?? 0;
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  const channels = colourType === 6 ? 4 : colourType === 2 ? 3 : 0;
  if (channels === 0) throw new Error(`unsupported PNG colour type ${colourType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)] ?? 0;
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x] ?? 0;
      const left = x >= channels ? (pixels[y * stride + x - channels] ?? 0) : 0;
      const up = y > 0 ? (pixels[(y - 1) * stride + x] ?? 0) : 0;
      const upLeft = y > 0 && x >= channels ? (pixels[(y - 1) * stride + x - channels] ?? 0) : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      pixels[y * stride + x] = (value + predicted) & 0xff;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = pixels[i * channels] ?? 0;
    rgba[i * 4 + 1] = pixels[i * channels + 1] ?? 0;
    rgba[i * 4 + 2] = pixels[i * channels + 2] ?? 0;
    rgba[i * 4 + 3] = channels === 4 ? (pixels[i * channels + 3] ?? 0) : 255;
  }
  return { width, height, rgba };
}
