/* =============================================================================
   Vitali Health AI — Vite config
   -----------------------------------------------------------------------------
   Two jobs:
   1. React + TS bundling.
   2. A tiny dev middleware that serves POST /api/llm by calling the SAME
      runLlm() the Vercel function uses (api/_llm.ts). This keeps the AI behavior
      identical in `npm run dev` and in production — and keeps every provider key
      server-side, never in the browser bundle.

   The LLM backend is pluggable (Anthropic / Ollama / AnythingLLM); see
   api/_llm.ts. All provider config is read from the environment, which we load
   into process.env below so the dev middleware sees it.
   ============================================================================= */

import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/** Read a JSON request body (dev middleware helper). */
function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/** Dev-only middleware that mirrors the /api/llm serverless function. */
function llmDevApi(): Plugin {
  return {
    name: 'vitali-llm-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/llm', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: false, reason: 'error', message: 'POST only' }));
          return;
        }
        // Import lazily so edits to the LLM core hot-reload in dev.
        const { runLlm } = await server.ssrLoadModule('/api/_llm.ts');
        const body = (await readJson(req)) as { kind?: string; payload?: unknown };
        const result = await runLlm(body.kind ?? '', body.payload);
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(result));
      });

      // Connector relay (Slack) — mirrors /api/relay in production.
      server.middlewares.use('/api/relay', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: false, message: 'POST only' }));
          return;
        }
        const { runRelay } = await server.ssrLoadModule('/api/_relay.ts');
        const body = (await readJson(req)) as { url?: unknown; payload?: unknown };
        const result = await runRelay(body.url, body.payload);
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(result));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Surface every .env var (not just VITE_*) to the dev server's process.env so
  // the LLM middleware can read provider keys and endpoints.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  return {
    plugins: [react(), llmDevApi()],
    server: { port: 5173 },
    build: { outDir: 'dist', sourcemap: false },
  };
});
