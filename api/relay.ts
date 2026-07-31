/* =============================================================================
   Vitali Health AI — /api/relay  (Vercel serverless function)
   -----------------------------------------------------------------------------
   Thin HTTP wrapper around runRelay(). Same pattern as /api/llm: the identical
   core is served locally by the Vite dev middleware and server/index.ts.
   ============================================================================= */

import type { VercelRequest, VercelResponse } from '@vercel/node';
// NOTE: explicit .js extension is required — this project is ESM ("type":"module"),
// so the Vercel Node runtime resolves relative imports with the compiled extension.
import { runRelay } from './_relay.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'POST only' });
    return;
  }
  const body = (req.body ?? {}) as { url?: unknown; payload?: unknown };
  const result = await runRelay(body.url, body.payload);
  res.status(200).json(result);
}
