/* =============================================================================
   Vitali Health AI — team connectors (Slack first)
   -----------------------------------------------------------------------------
   Lets the Data agent push where the team already lives: unit reports and
   critical alerts go to a Slack channel via an incoming webhook. The webhook
   URL is configured per device in Profile → Connectors and posted through the
   server-side /api/relay (Slack webhooks don't answer browser CORS).
   More connectors (Teams, generic webhooks, …) slot in beside postSlack().
   ============================================================================= */

const SLACK_KEY = 'vitali.connect.slack';
const ALERTS_KEY = 'vitali.connect.alerts';

export function getSlackWebhook(): string {
  try {
    return localStorage.getItem(SLACK_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setSlackWebhook(url: string): void {
  try {
    if (url.trim()) localStorage.setItem(SLACK_KEY, url.trim());
    else localStorage.removeItem(SLACK_KEY);
  } catch {
    /* storage blocked — connector stays session-only */
  }
}

export function slackConfigured(): boolean {
  return getSlackWebhook().startsWith('https://hooks.slack.com/');
}

/** Whether critical-patient alerts should auto-post to Slack. */
export function alertsEnabled(): boolean {
  try {
    return localStorage.getItem(ALERTS_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAlertsEnabled(on: boolean): void {
  try {
    localStorage.setItem(ALERTS_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Post a message to the configured Slack channel. Returns whether Slack took it. */
export async function postSlack(text: string): Promise<boolean> {
  if (!slackConfigured()) return false;
  try {
    const res = await fetch('/api/relay', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: getSlackWebhook(), payload: { text } }),
    });
    const data = (await res.json()) as { ok: boolean };
    return data.ok;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget critical alert from the live monitor. De-identified: room +
 * change only — no patient name leaves the app.
 */
export function alertSlack(room: string, change: string): void {
  if (!alertsEnabled() || !slackConfigured()) return;
  void postSlack(`:rotating_light: Vitali alert — Room ${room}: ${change}`);
}
