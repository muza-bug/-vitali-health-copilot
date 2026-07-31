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
interface ReportPayload {
  unit: string;
  circles: {
    label: string; // de-identified, e.g. "Room 412 — sepsis watch"
    status: string;
    vitals?: VitalsLite;
    openTasks: string[];
    recentUpdates: string[];
    teamSize: number;
  }[];
  nursesOnline: number;
  nursesTotal: number;
  openTaskCount: number;
}
interface DebriefPayload {
  caseLabel: string;
  reason: string;
  flags: string[];
  finalVitals?: VitalsLite;
  timeline: string[]; // "12:04 note: ..." chronological
  tasks: { label: string; status: string; minutes?: number }[];
  recordings: string[]; // transcripts
}
interface AskPayload {
  question: string;
  context: HandoffPayload;
}

/** Cumulative Claude token usage for this server instance (best-effort). */
const sessionUsage = { inputTokens: 0, outputTokens: 0, calls: 0 };

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export type LlmResult =
  | { ok: true; connected: boolean; provider: Provider | null; model: string } // ping
  | { ok: true; text: string; usage?: LlmUsage }
  | { ok: true; items: string[]; usage?: LlmUsage }
  | {
      ok: true;
      usage: LlmUsage & { calls: number };
      provider: Provider | null;
      model: string;
    } // usage
  | { ok: false; reason: 'no_key' | 'credits' | 'rate_limit' | 'auth' | 'error'; message?: string };

/** Shared, stable system instruction (cache-friendly prefix). */
const SYSTEM = `You are the AI assistant for hospital nurses inside the Vitali app. You power a care assistant, a real-time data agent that reports on the unit, and a training coach that debriefs closed cases.
Rules:
- Use ONLY the facts provided. Never invent vitals, history, medications, or events.
- You support nurses; you never replace them. Do not diagnose, prescribe, or give medication doses. Frame everything as suggestions to verify against hospital protocol and the care team's clinical judgment.
- If the situation could be urgent, say plainly that the nurse should escalate to the provider on call — never talk them out of escalating.
- Be concise, calm, and factual — write the way an experienced nurse briefs the next nurse.
- Plain language. No markdown headers. No preamble like "Here is" — start with the content.
- If something important is missing, note it briefly rather than guessing. Say when you are uncertain.
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

interface Completion {
  text: string;
  usage: LlmUsage;
}

async function completeAnthropic(user: string, maxTokens: number, think: boolean): Promise<Completion> {
  const message = await getAnthropic().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    // Adaptive thinking for the agent calls (unit report, case debrief, Q&A);
    // off for the short helpers so they stay fast. The system prompt forbids
    // leaking reasoning into the answer (Opus 4.8 guidance).
    thinking: { type: think ? 'adaptive' : 'disabled' },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });
  const usage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
  sessionUsage.inputTokens += usage.inputTokens;
  sessionUsage.outputTokens += usage.outputTokens;
  sessionUsage.calls += 1;
  return { text: textOf(message), usage };
}

async function completeOllama(user: string, maxTokens: number): Promise<Completion> {
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
  // Local models don't bill tokens — report zero usage.
  return { text: (data.message?.content ?? '').trim(), usage: { inputTokens: 0, outputTokens: 0 } };
}

async function completeAnythingLlm(user: string, _maxTokens: number): Promise<Completion> {
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
  return { text: (data.textResponse ?? '').trim(), usage: { inputTokens: 0, outputTokens: 0 } };
}

/** Provider-agnostic completion. Throws if no backend is configured. */
async function complete(user: string, maxTokens: number, think = false): Promise<Completion> {
  switch (resolveProvider()) {
    case 'anthropic':
      return completeAnthropic(user, maxTokens, think);
    case 'ollama':
      return completeOllama(user, maxTokens);
    case 'anythingllm':
      return completeAnythingLlm(user, maxTokens);
    default:
      throw new Error('no provider configured');
  }
}

/**
 * Map a provider failure to a reason the UI can act on — most importantly
 * "credits": the Anthropic account is out of funds and the owner needs to
 * top up in the Console dashboard (console.anthropic.com → Billing).
 */
function classifyError(err: unknown): { reason: 'credits' | 'rate_limit' | 'auth' | 'error'; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof Anthropic.APIError) {
    if (err.status === 400 && /credit balance is too low|billing/i.test(message)) {
      return { reason: 'credits', message };
    }
    if (err.status === 429) return { reason: 'rate_limit', message };
    if (err.status === 401 || err.status === 403) return { reason: 'auth', message };
  }
  return { reason: 'error', message };
}

/* ------------------------------------------------------------------ handlers */

/** Render the shared patient-context block used by handoff and ask. */
function contextLines(p: HandoffPayload): string {
  const v = p.patient.vitals;
  return [
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
}

export async function runLlm(kind: string, payload: unknown): Promise<LlmResult> {
  const provider = resolveProvider();

  // Health check for the Profile "connections" card — never calls the model.
  if (kind === 'ping') {
    return { ok: true, connected: provider !== null, provider, model: ANTHROPIC_MODEL };
  }

  // Cumulative token spend for this server instance — never calls the model.
  if (kind === 'usage') {
    return { ok: true, usage: { ...sessionUsage }, provider, model: ANTHROPIC_MODEL };
  }

  if (!provider) return { ok: false, reason: 'no_key' };

  try {
    switch (kind) {
      case 'handoff': {
        const p = payload as HandoffPayload;
        const { text, usage } = await complete(
          `Write a 3–5 sentence handoff briefing for the nurse taking over this patient. ` +
            `Lead with who they are and why they're here, then current status and what to watch, ` +
            `then the open tasks.\n\n${contextLines(p)}`,
          700,
        );
        return { ok: true, text, usage };
      }

      case 'suggest': {
        const p = payload as SuggestPayload;
        const lines = [
          `Status: ${p.status}. Reason: ${p.reason}.`,
          `Recent updates: ${p.recentNotes.join(' | ') || '(none)'}.`,
          `Open tasks: ${p.openTasks.join('; ') || 'none'}.`,
        ].join('\n');
        const { text, usage } = await complete(
          `Suggest 2–4 prioritized next steps for the nursing team. ` +
            `Return ONE step per line, no numbering, no bullets, each under 12 words.\n\n${lines}`,
          320,
        );
        const items = text
          .split('\n')
          .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
          .filter(Boolean)
          .slice(0, 4);
        return { ok: true, items, usage };
      }

      case 'summarize': {
        const p = payload as SummarizePayload;
        const { text, usage } = await complete(
          `Summarize this nurse's spoken voice note into one tidy timeline line ` +
            `(under 16 words), preserving any numbers:\n\n"${p.transcript}"`,
          120,
        );
        return { ok: true, text, usage };
      }

      /* -------------------------------------------------- data agent: report */
      // Real-time unit report: organizes what every nurse is logging right now
      // into one prioritized briefing (also shareable to Slack from the UI).
      case 'report': {
        const p = payload as ReportPayload;
        const lines = [
          `Unit: ${p.unit}. Nurses online: ${p.nursesOnline}/${p.nursesTotal}. Open tasks unit-wide: ${p.openTaskCount}.`,
          ...p.circles.map((c) => {
            const v = c.vitals;
            return [
              `- ${c.label} [${c.status}] team of ${c.teamSize}.`,
              v ? ` Vitals: HR ${v.hr}, BP ${v.bp}, SpO2 ${v.spo2}%, Temp ${v.temp}C, Pain ${v.pain}/10.` : '',
              c.openTasks.length ? ` Open: ${c.openTasks.join('; ')}.` : '',
              c.recentUpdates.length ? ` Recent: ${c.recentUpdates.join(' | ')}.` : '',
            ].join('');
          }),
        ].join('\n');
        const { text, usage } = await complete(
          `You are the unit's data agent. From this live snapshot, produce a real-time report ` +
            `for the charge nurse. Return ONLY compact JSON (no code fences) with exactly these keys:\n` +
            `{"headline": one sentence on the unit's overall state, ` +
            `"attention": [1-4 strings, most urgent patients/actions first], ` +
            `"watch": [1-3 strings, things trending the wrong way], ` +
            `"workload": [1-3 strings about tasks/team load]}\n` +
            `Keep every string under 20 words. Use only the data below.\n\n${lines}`,
          2500,
          true,
        );
        return { ok: true, text, usage };
      }

      /* --------------------------------------------- training agent: debrief */
      // Teaching debrief over a closed case: what happened, what went well,
      // and what could have been done better — framed as education, not blame.
      case 'debrief': {
        const p = payload as DebriefPayload;
        const v = p.finalVitals;
        const lines = [
          `Case: ${p.caseLabel}. Reason: ${p.reason}. Flags: ${p.flags.join(', ') || 'none'}.`,
          v ? `Final vitals: HR ${v.hr}, BP ${v.bp}, SpO2 ${v.spo2}%, Temp ${v.temp}C, Pain ${v.pain}/10.` : '',
          `Timeline (chronological):`,
          ...p.timeline.map((t) => `- ${t}`),
          `Tasks:`,
          ...p.tasks.map((t) => `- [${t.status}] ${t.label}${t.minutes != null ? ` (${t.minutes} min)` : ''}`),
          p.recordings.length ? `Voice notes: ${p.recordings.map((r) => `"${r}"`).join(' | ')}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        const { text, usage } = await complete(
          `You are the training coach. Write a teaching debrief of this closed case for nurses ` +
            `who were not on it. Educational reflection, never blame — praise concrete good moves, and frame ` +
            `improvements as "next time, consider". Use exactly these four plain-text section headers, ` +
            `each on its own line, each section 1-3 sentences or short lines:\n` +
            `WHAT HAPPENED:\nWHAT WENT WELL:\nWHAT COULD BE IMPROVED:\nTEACHING POINTS:\n\n${lines}`,
          3000,
          true,
        );
        return { ok: true, text, usage };
      }

      /* --------------------------------------------------- assistant: ask AI */
      // Free-form question grounded in one Circle's context.
      case 'ask': {
        const p = payload as AskPayload;
        const { text, usage } = await complete(
          `A nurse on this patient's care team asks: "${p.question}"\n\n` +
            `Answer in 1-4 sentences using only the patient context below. If the answer isn't in ` +
            `the data, say so. If it's a clinical judgment call, remind them to follow protocol or ` +
            `check with the provider.\n\n${contextLines(p.context)}`,
          1500,
          true,
        );
        return { ok: true, text, usage };
      }

      default:
        return { ok: false, reason: 'error', message: `unknown kind: ${kind}` };
    }
  } catch (err) {
    // Classify so the UI can tell "out of Claude credits — top up in the
    // Console dashboard" apart from a transient failure, then let the
    // frontend fall back to its local mock either way.
    console.error('[llm] error', err);
    const { reason, message } = classifyError(err);
    return { ok: false, reason, message };
  }
}
