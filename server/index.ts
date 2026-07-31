/* =============================================================================
   Vitali Health AI — Self-hosted production server
   -----------------------------------------------------------------------------
   For running OUTSIDE Vercel (e.g. the bundled Docker stack). Serves the built
   SPA from /dist and exposes POST /api/llm via the SAME runLlm() the Vercel
   function and the Vite dev middleware use — so AI behavior is identical in dev,
   on Vercel, and in Docker. Keeps every provider key server-side.

   Run with:  npm run build && npm start   (npm start uses tsx — no compile step)
   ============================================================================= */

import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { runLlm } from '../api/_llm';
import { runRelay } from '../api/_relay';

const DIST = join(process.cwd(), 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
    req.on('error', () => resolve(''));
  });
}

async function serveStatic(urlPath: string, res: ServerResponse): Promise<void> {
  // Resolve safely inside DIST; fall back to index.html for SPA routes.
  const clean = normalize(urlPath.split('?')[0]).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST, clean === '/' ? 'index.html' : clean);
  try {
    let body = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    try {
      const html = await readFile(join(DIST, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(html);
    } catch {
      res.writeHead(404).end('Not found');
    }
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) return res.writeHead(400).end();

  if (req.url === '/api/llm') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, reason: 'error', message: 'POST only' }));
      return;
    }
    const raw = await readBody(req);
    let body: { kind?: string; payload?: unknown } = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      /* keep defaults */
    }
    const result = await runLlm(body.kind ?? '', body.payload);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.url === '/api/relay') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: 'POST only' }));
      return;
    }
    const raw = await readBody(req);
    let body: { url?: unknown; payload?: unknown } = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      /* keep defaults */
    }
    const result = await runRelay(body.url, body.payload);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  await serveStatic(req.url, res);
});

server.listen(PORT, () => {
  console.log(`Vitali Health AI listening on http://localhost:${PORT}`);
});
