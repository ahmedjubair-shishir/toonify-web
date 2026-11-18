// Tiny static server for test fixtures (content scripts don't run on file:// by default).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  const path = normalize(new URL(req.url ?? '/', 'http://x').pathname).replace(/^(\.\.[/\\])+/, '');
  // Same theme page, but with a strict Content Security Policy like many real sites.
  if (path === '/csp-theme.html') {
    const body = await readFile(join(root, 'theme.html'));
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy':
        "default-src 'self'; img-src 'self' data: http://127.0.0.1:4173; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'",
    });
    return res.end(body);
  }
  // A tiny "icon CDN" for custom icon sets: only search.svg and home.svg exist.
  // CORS is open, like jsDelivr and unpkg.
  if (path.startsWith('/cdn/')) {
    const name = path.slice('/cdn/'.length).replace(/\.svg$/, '');
    const ring =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    const known = { search: ring, home: ring };
    const cors = { 'access-control-allow-origin': '*' };
    if (!(name in known)) {
      res.writeHead(404, { 'content-type': 'text/plain', ...cors });
      return res.end('Not found');
    }
    res.writeHead(200, { 'content-type': 'image/svg+xml', ...cors });
    return res.end(known[name]);
  }
  // Icons page under the strictest common policy: images only from the site itself
  // (no data: URLs), to prove swapped icons still draw (or fall back cleanly).
  if (path === '/csp-icons.html') {
    const body = await readFile(join(root, 'icons.html'));
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy':
        "default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'none'",
    });
    return res.end(body);
  }
  try {
    const body = await readFile(join(root, path === '/' ? 'static.html' : path));
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`Fixtures on http://localhost:${port}`));
