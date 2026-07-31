/* =============================================================================
   Vitali Health AI — connector relay core (server-side)
   -----------------------------------------------------------------------------
   Forwards Data-agent reports and critical alerts to team connectors (Slack
   incoming webhooks today; the allowlist below is where more connectors get
   added). Runs server-side because Slack webhooks don't answer browser CORS —
   and so the relay, not the browser, decides which hosts are reachable.
   Shared by api/relay.ts (Vercel), the Vite dev middleware, and server/index.ts.
   ============================================================================= */

export type RelayResult = { ok: true; status: number } | { ok: false; message: string };

/** Hosts the relay will talk to. Keeps this from becoming an open proxy. */
const ALLOWED_HOSTS = ['hooks.slack.com'];

export async function runRelay(rawUrl: unknown, payload: unknown): Promise<RelayResult> {
  if (typeof rawUrl !== 'string') return { ok: false, message: 'missing url' };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, message: 'invalid url' };
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.includes(url.hostname)) {
    return { ok: false, message: `only these hosts are allowed: ${ALLOWED_HOSTS.join(', ')}` };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    return { ok: res.ok, status: res.status } as RelayResult;
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
