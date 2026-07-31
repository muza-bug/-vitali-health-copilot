/* =============================================================================
   Vitali Health AI — /api/llm  (Vercel serverless function)
   -----------------------------------------------------------------------------
   Thin HTTP wrapper around runLlm(). Deployed automatically by Vercel from the
   /api directory. Locally, the same runLlm() is served by a Vite dev middleware
   (see vite.config.ts) so behavior matches in dev and prod.
   ============================================================================= */

import type { VercelRequest, VercelResponse } from '@vercel/node';
// NOTE: explicit .js extension is required — this project is ESM ("type":"module"),
// so the Vercel Node runtime resolves relative imports with the compiled extension.
import { runLlm } from './_llm.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'error', message: 'POST only' });
    return;
  }
  const body = (req.body ?? {}) as { kind?: string; payload?: unknown };
  const result = await runLlm(body.kind ?? '', body.payload);
  res.status(200).json(result);
}
