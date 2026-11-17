// Stand-in for the real Cartoonize server (server/), for browser tests.
// Answers like the real one (CORS for extensions, JSON errors) and records
// what the extension sent. No AI, no network, no cost.
import { createServer } from 'node:http';
import { deflateSync } from 'node:zlib';

const port = Number(process.env.PORT ?? 4174);
let requests = [];
let failWith = null; // e.g. { status: 429, code: 'user-limit', message: '...' }

/** A solid orange PNG, built by hand so no image files are needed. */
function solidPng(width, height, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat()),
  ]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', pixels),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const CARTOON = solidPng(400, 240, [255, 140, 0]);

const cors = (origin) =>
  /^chrome-extension:\/\//.test(origin ?? '')
    ? {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-toonify-install',
      }
    : {};

createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (req.url === '/__requests')
    return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(requests));
  if (req.url === '/__reset') {
    requests = [];
    failWith = null;
    return res.writeHead(204).end();
  }
  if (req.url?.startsWith('/__fail')) {
    failWith = {
      status: 429,
      code: 'user-limit',
      message: 'You have cartoonized a lot of images. Please try again in an hour.',
    };
    return res.writeHead(204).end();
  }
  if (req.url !== '/api/cartoonize') return res.writeHead(404).end();
  if (req.method === 'OPTIONS')
    return res
      .writeHead(cors(origin)['access-control-allow-origin'] ? 204 : 403, cors(origin))
      .end();

  let raw = '';
  for await (const chunk of req) raw += chunk;
  requests.push({
    origin,
    install: req.headers['x-toonify-install'],
    body: JSON.parse(raw || '{}'),
  });
  if (failWith) {
    return res
      .writeHead(failWith.status, { 'content-type': 'application/json', ...cors(origin) })
      .end(JSON.stringify({ error: { code: failWith.code, message: failWith.message } }));
  }
  res.writeHead(200, { 'content-type': 'image/png', ...cors(origin) }).end(CARTOON);
}).listen(port, () => console.log(`Fake cartoonize server on http://localhost:${port}`));
