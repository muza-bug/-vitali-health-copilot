/* =============================================================================
   Vitali Health AI — LLM core (server-side, pluggable backend)
   -----------------------------------------------------------------------------
   The real AI integration. Runs ONLY on the server (Vercel function in prod,
   Vite dev middleware locally) so no provider key reaches the browser. It is
   framework-agnostic: `runLlm(kind, payload)` is called by both api/llm.ts
   (Vercel) and the dev plugin in vite.config.ts.

   THREE interchangeable backends, chosen by LLM_PROVIDER (see .env.example):
     • anthropic   — Claude, hosted, highest quality (default when keyed)
     • ollama      — fully local & private (great with the bundled docker-compose)
     • anythingllm — local RAG over your own clinical docs
   `auto` picks the first one that's configured. With none configured, every
   handler returns { ok: false, reason: 'no_key' } and the frontend falls back to
   its local mock — so the prototype always works.

   ⚠️ PHI note: this prototype sends mock patient context to whichever model is
   configured. A production deployment handling real patient data needs a BAA (or
   a fully local model like Ollama) and the usual HIPAA controls. Everything here
   is invented sample data.
   ============================================================================= */

import Anthropic from '@anthropic-ai/sdk';

type Provider = 'anthropic' | 'ollama' | 'anythingllm';

/** Default Claude model. Override with ANTHROPIC_MODEL. */
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

/** Pick the active backend from the environment. Returns null when none is usable. */
function resolveProvider(): Provider | null {
  const choice = (process.env.LLM_PROVIDER || 'auto').toLowerCase();
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasAnythingLlm = Boolean(process.env.ANYTHINGLLM_API_KEY);

  if (choice === 'anthropic') return hasAnthropic ? 'anthropic' : null;
  if (choice === 'ollama') return 'ollama'; // local, keyless — trust the operator's choice
  if (choice === 'anythingllm') return hasAnythingLlm ? 'anythingllm' : null;

  // auto: prefer hosted quality, then local RAG. Ollama isn't auto-selected
  // (we can't tell if the local server is up) — set LLM_PROVIDER=ollama to use it.
  if (hasAnthropic) return 'anthropic';
  if (hasAnythingLlm) return 'anythingllm';
  return null;
}

let anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropic) anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return anthropic;
}

/* ----------------------------------------------------------------- payloads */
interface VitalsLite {
  hr: number;
  bp: string;
  spo2: number;
  temp: number;
  resp: number;
  pain: number;
}
interface HandoffPayload {
  patient: { name: string; room: string; age: number; sex: string; flags: string[]; vitals?: VitalsLite };
  reason: string;
  status: string;
  notes: string;
  recentNotes: string[];
  openTasks: string[];
}
interface SuggestPayload {
  status: string;
  reason: string;
  recentNotes: string[];
  openTasks: string[];
}
interface SummarizePayload {
  transcript: string;
}

export type LlmResult =
  | { ok: true; connected: boolean; provider: Provider | null } // ping
  | { ok: true; text: string }
  | { ok: true; items: string[] }
  | { ok: false; reason: 'no_key' | 'error'; message?: string };

/** Shared, stable system instruction (cache-friendly prefix). */
const SYSTEM = `You are a clinical handoff assistant for hospital nurses inside the Vitali app.
Rules:
- Use ONLY the facts provided. Never invent vitals, history, medications, or events.
- Be concise, calm, and factual — write the way an experienced nurse briefs the next nurse.
- Plain language. No markdown headers. No preamble like "Here is" — start with the content.
- If something important is missing, you may note it briefly rather than guessing.
- Respond with the answer only. Do not include your reasoning.`;

/* ---------------------------------------------------------- provider drivers */

/** Pull the first text block out of a Claude Messages response. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

async function completeAnthropic(user: string, maxTokens: number): Promise<string> {
  const message = await getAnthropic().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    // Thinking off keeps these short helper calls fast; the system prompt forbids
    // leaking reasoning into the answer (Opus 4.8 guidance).
    thinking: { type: 'disabled' },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });
  return textOf(message);
}

async function completeOllama(user: string, maxTokens: number): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1';
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { num_predict: maxTokens, temperature: 0.3 },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').trim();
}

async function completeAnythingLlm(user: string, _maxTokens: number): Promise<string> {
  const base = process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001';
  const ws = process.env.ANYTHINGLLM_WORKSPACE || 'vitali';
  const key = process.env.ANYTHINGLLM_API_KEY;
  const res = await fetch(`${base}/api/v1/workspace/${ws}/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${key}` },
    // AnythingLLM owns the workspace system prompt + retrieval; we prepend ours
    // to keep the model grounded in the supplied facts.
    body: JSON.stringify({ message: `${SYSTEM}\n\n${user}`, mode: 'chat' }),
  });
  if (!res.ok) throw new Error(`anythingllm ${res.status}`);
  const data = (await res.json()) as { textResponse?: string };
  return (data.textResponse ?? '').trim();
}

/** Provider-agnostic completion. Throws if no backend is configured. */
async function complete(user: string, maxTokens: number): Promise<string> {
  switch (resolveProvider()) {
    case 'anthropic':
      return completeAnthropic(user, maxTokens);
    case 'ollama':
      return completeOllama(user, maxTokens);
    case 'anythingllm':
      return completeAnythingLlm(user, maxTokens);
    default:
      throw new Error('no provider configured');
  }
}

/* ------------------------------------------------------------------ handlers */

export async function runLlm(kind: string, payload: unknown): Promise<LlmResult> {
  const provider = resolveProvider();

  // Health check for the Profile "connections" card — never calls the model.
  if (kind === 'ping') {
    return { ok: true, connected: provider !== null, provider };
  }

  if (!provider) return { ok: false, reason: 'no_key' };

  try {
    switch (kind) {
      case 'handoff': {
        const p = payload as HandoffPayload;
        const v = p.patient.vitals;
        const lines = [
          `Patient: ${p.patient.name}, Room ${p.patient.room}, ${p.patient.age}${p.patient.sex}.`,
          `Reason for admission: ${p.reason}.`,
          `Current status: ${p.status}.`,
          `Flags: ${p.patient.flags.join(', ') || 'none on file'}.`,
          v
            ? `Latest vitals: HR ${v.hr}, BP ${v.bp}, SpO2 ${v.spo2}%, Temp ${v.temp}C, Resp ${v.resp}, Pain ${v.pain}/10.`
            : 'No vitals recorded.',
          `Key context note: ${p.notes || '(none)'}.`,
          `Recent updates (oldest to newest): ${p.recentNotes.join(' | ') || '(none)'}.`,
          `Open tasks to pick up: ${p.openTasks.join('; ') || 'none'}.`,
        ].join('\n');
        const text = await complete(
          `Write a 3–5 sentence handoff briefing for the nurse taking over this patient. ` +
            `Lead with who they are and why they're here, then current status and what to watch, ` +
            `then the open tasks.\n\n${lines}`,
          700,
        );
        return { ok: true, text };
      }

      case 'suggest': {
        const p = payload as SuggestPayload;
        const lines = [
          `Status: ${p.status}. Reason: ${p.reason}.`,
          `Recent updates: ${p.recentNotes.join(' | ') || '(none)'}.`,
          `Open tasks: ${p.openTasks.join('; ') || 'none'}.`,
        ].join('\n');
        const text = await complete(
          `Suggest 2–4 prioritized next steps for the nursing team. ` +
            `Return ONE step per line, no numbering, no bullets, each under 12 words.\n\n${lines}`,
          320,
        );
        const items = text
          .split('\n')
          .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
          .filter(Boolean)
          .slice(0, 4);
        return { ok: true, items };
      }

      case 'summarize': {
        const p = payload as SummarizePayload;
        const text = await complete(
          `Summarize this nurse's spoken voice note into one tidy timeline line ` +
            `(under 16 words), preserving any numbers:\n\n"${p.transcript}"`,
          120,
        );
        return { ok: true, text };
      }

      default:
        return { ok: false, reason: 'error', message: `unknown kind: ${kind}` };
    }
  } catch (err) {
    // Any API/auth/rate/network error → let the frontend fall back to its local mock.
    console.error('[llm] error', err);
    return { ok: false, reason: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}
