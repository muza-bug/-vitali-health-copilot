/* =============================================================================
   Vitali Health AI — LLM client (browser side)
   -----------------------------------------------------------------------------
   Talks to /api/llm, which runs the model server-side (api/_llm.ts) so no
   provider key ever touches the bundle. The backend is pluggable — Anthropic,
   a local Ollama, or AnythingLLM — but this client doesn't care which: it just
   asks for a handoff / suggestions / summary and gets text back.

   Every call degrades to a believable LOCAL mock when no backend is configured
   or a request fails, so the prototype is always interactive. Each result is
   tagged with its `source` ('ai' | 'mock') so the UI can be honest about it.
   ============================================================================= */

import type { Circle, TrainingCase } from '../types/models';

export type AiSource = 'ai' | 'mock';
interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}
type LlmResponse =
  | { ok: true; connected: boolean; model?: string }
  | { ok: true; text: string; usage?: LlmUsage }
  | { ok: true; items: string[]; usage?: LlmUsage }
  | { ok: false; reason: string; message?: string };

/* ------------------------------------------------------------- AI health bus */
// Tracks whether the model account is out of credits (or otherwise degraded) so
// any screen can tell the owner to top up in the Claude Console dashboard.
// Kept module-level: one truth per open window, no context plumbing needed.

export interface AiHealth {
  /** True once the provider reports the credit balance is exhausted. */
  creditsExhausted: boolean;
  /** Last non-ok reason seen ('credits' | 'rate_limit' | 'auth' | 'error' | 'no_key'). */
  lastReason: string | null;
}

const health: AiHealth = { creditsExhausted: false, lastReason: null };
const healthListeners = new Set<(h: AiHealth) => void>();

export function getAiHealth(): AiHealth {
  return { ...health };
}

export function subscribeAiHealth(cb: (h: AiHealth) => void): () => void {
  healthListeners.add(cb);
  return () => healthListeners.delete(cb);
}

function reportHealth(reason: string | null) {
  const prevReason = health.lastReason;
  const prevCredits = health.creditsExhausted;
  health.lastReason = reason;
  if (reason === 'credits') health.creditsExhausted = true;
  if (reason === null) health.creditsExhausted = false; // a success clears it (top-up happened)
  if (health.lastReason === prevReason && health.creditsExhausted === prevCredits) return;
  for (const cb of healthListeners) cb({ ...health });
}

/* -------------------------------------------------------- token accounting */
// Cumulative Claude token spend observed from this device, so the Profile
// screen can show usage against the credits bought in the Claude dashboard.

const USAGE_KEY = 'vitali.ai.tokens';

export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export function getTokenTotals(): TokenTotals {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) return JSON.parse(raw) as TokenTotals;
  } catch {
    /* fresh totals below */
  }
  return { inputTokens: 0, outputTokens: 0, calls: 0 };
}

function recordUsage(usage?: LlmUsage) {
  if (!usage) return;
  const t = getTokenTotals();
  t.inputTokens += usage.inputTokens;
  t.outputTokens += usage.outputTokens;
  t.calls += 1;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(t));
  } catch {
    /* storage full/blocked — usage display is best-effort */
  }
}

async function callApi(kind: string, payload?: unknown): Promise<LlmResponse> {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, payload }),
  });
  const data = (await res.json()) as LlmResponse;
  if (data.ok) {
    if ('usage' in data) recordUsage(data.usage);
    reportHealth(null);
  } else if (data.reason !== 'no_key') {
    reportHealth(data.reason);
  }
  return data;
}

/** True when a real model backend is wired (any provider). Never throws. */
export async function isAiConnected(): Promise<boolean> {
  try {
    const r = await callApi('ping');
    return r.ok && 'connected' in r && r.connected;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ payload shaping */
function vitalsLite(circle: Circle) {
  const v = circle.patient.vitals;
  return v ? { hr: v.hr, bp: v.bp, spo2: v.spo2, temp: v.temp, resp: v.resp, pain: v.pain } : undefined;
}

function handoffPayload(circle: Circle, recentNotes: string[], openTasks: string[]) {
  const p = circle.patient;
  return {
    patient: {
      name: p.name,
      room: p.room,
      age: p.age,
      sex: p.sex,
      flags: p.flags.map((f) => f.label),
      vitals: vitalsLite(circle),
    },
    reason: circle.reason,
    status: circle.status,
    notes: circle.notes,
    recentNotes,
    openTasks,
  };
}

/* ----------------------------------------------------------------- handoff */

export async function aiHandoff(
  circle: Circle,
  recentNotes: string[],
  openTasks: string[],
): Promise<{ text: string; source: AiSource }> {
  try {
    const r = await callApi('handoff', handoffPayload(circle, recentNotes, openTasks));
    if (r.ok && 'text' in r && r.text.trim()) return { text: r.text.trim(), source: 'ai' };
  } catch {
    /* fall through to mock */
  }
  return { text: mockHandoff(circle, recentNotes, openTasks), source: 'mock' };
}

/* --------------------------------------------------------------- suggestions */

export async function aiSuggest(
  circle: Circle,
  recentNotes: string[],
  openTasks: string[],
): Promise<{ items: string[]; source: AiSource }> {
  try {
    const r = await callApi('suggest', {
      status: circle.status,
      reason: circle.reason,
      recentNotes,
      openTasks,
    });
    if (r.ok && 'items' in r && r.items.length) return { items: r.items, source: 'ai' };
  } catch {
    /* fall through to mock */
  }
  return { items: mockSuggest(circle, openTasks), source: 'mock' };
}

/* ----------------------------------------------------------------- summarize */

export async function aiSummarize(
  transcript: string,
): Promise<{ text: string; source: AiSource }> {
  try {
    const r = await callApi('summarize', { transcript });
    if (r.ok && 'text' in r && r.text.trim()) return { text: r.text.trim(), source: 'ai' };
  } catch {
    /* fall through to mock */
  }
  return { text: mockSummarize(transcript), source: 'mock' };
}

/* ------------------------------------------------------- data agent: report */

/** De-identified live snapshot the Data agent reports on. */
export interface UnitSnapshot {
  unit: string;
  circles: {
    label: string;
    status: string;
    vitals?: { hr: number; bp: string; spo2: number; temp: number; resp: number; pain: number };
    openTasks: string[];
    recentUpdates: string[];
    teamSize: number;
  }[];
  nursesOnline: number;
  nursesTotal: number;
  openTaskCount: number;
}

export interface UnitReport {
  headline: string;
  attention: string[];
  watch: string[];
  workload: string[];
  generatedAt: string;
  source: AiSource;
}

function parseReportJson(text: string): Omit<UnitReport, 'generatedAt' | 'source'> | null {
  try {
    // Tolerate stray code fences or prose around the JSON object.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const raw = JSON.parse(match[0]) as Record<string, unknown>;
    const arr = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    if (typeof raw.headline !== 'string') return null;
    return {
      headline: raw.headline,
      attention: arr(raw.attention),
      watch: arr(raw.watch),
      workload: arr(raw.workload),
    };
  } catch {
    return null;
  }
}

export async function aiUnitReport(snapshot: UnitSnapshot): Promise<UnitReport> {
  try {
    const r = await callApi('report', snapshot);
    if (r.ok && 'text' in r) {
      const parsed = parseReportJson(r.text);
      if (parsed) return { ...parsed, generatedAt: new Date().toISOString(), source: 'ai' };
    }
  } catch {
    /* fall through to mock */
  }
  return { ...mockUnitReport(snapshot), generatedAt: new Date().toISOString(), source: 'mock' };
}

/* --------------------------------------------------- training agent: debrief */

export async function aiDebrief(
  tc: TrainingCase,
): Promise<{ text: string; source: AiSource }> {
  const v = tc.finalVitals;
  const payload = {
    caseLabel: tc.caseLabel,
    reason: tc.reason,
    flags: tc.flags.map((f) => f.label),
    finalVitals: v
      ? { hr: v.hr, bp: v.bp, spo2: v.spo2, temp: v.temp, resp: v.resp, pain: v.pain }
      : undefined,
    timeline: tc.timeline.map(
      (t) => `${new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${t.kind}: ${t.text}`,
    ),
    tasks: tc.tasks.map((t) => ({
      label: t.label,
      status: t.status,
      minutes: t.durationMs != null ? Math.round(t.durationMs / 60000) : undefined,
    })),
    recordings: tc.recordings.map((r) => r.transcript).filter((t): t is string => Boolean(t)),
  };
  try {
    const r = await callApi('debrief', payload);
    if (r.ok && 'text' in r && r.text.trim()) return { text: r.text.trim(), source: 'ai' };
  } catch {
    /* fall through to mock */
  }
  return { text: mockDebrief(tc), source: 'mock' };
}

/* ----------------------------------------------------------- assistant: ask */

export async function aiAsk(
  circle: Circle,
  recentNotes: string[],
  openTasks: string[],
  question: string,
): Promise<{ text: string; source: AiSource }> {
  try {
    const r = await callApi('ask', {
      question,
      context: handoffPayload(circle, recentNotes, openTasks),
    });
    if (r.ok && 'text' in r && r.text.trim()) return { text: r.text.trim(), source: 'ai' };
  } catch {
    /* fall through to mock */
  }
  return { text: mockAsk(circle, question), source: 'mock' };
}

/* =============================================================================
   Local mocks — deterministic, grounded only in the data passed in.
   ============================================================================= */

function mockHandoff(circle: Circle, recentNotes: string[], openTasks: string[]): string {
  const p = circle.patient;
  const who = p.age > 0 ? `${p.name}, ${p.age}${p.sex}, in Room ${p.room}` : `${p.name} in Room ${p.room}`;
  const v = p.vitals;
  const parts = [
    `${who} — ${circle.reason}. Currently ${circle.status}.`,
    v ? `Latest vitals: HR ${v.hr}, BP ${v.bp}, SpO₂ ${v.spo2}%, Temp ${v.temp}°C.` : '',
    circle.notes.trim() ? circle.notes.trim() : '',
    recentNotes.length ? `Most recent: ${recentNotes[recentNotes.length - 1]}` : '',
    openTasks.length ? `To pick up: ${openTasks.join('; ')}.` : 'No open tasks.',
  ].filter(Boolean);
  return parts.join(' ');
}

function mockSuggest(circle: Circle, openTasks: string[]): string[] {
  const out: string[] = [];
  if (circle.status === 'critical') {
    out.push('Recheck vitals now and escalate if worsening');
    out.push('Confirm on-call provider is aware');
  } else if (circle.status === 'monitoring') {
    out.push('Reassess at next scheduled vitals');
  }
  const v = circle.patient.vitals;
  if (v && v.spo2 < 92) out.push('Review oxygen — SpO₂ below target');
  if (v && v.pain >= 4) out.push('Reassess pain control');
  if (openTasks.length) out.push(`Prioritize: ${openTasks[0]}`);
  if (out.length === 0) out.push('Continue current plan; document next check');
  return out.slice(0, 4);
}

function mockSummarize(transcript: string): string {
  const clean = transcript.replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  return words.length <= 16 ? clean : words.slice(0, 16).join(' ') + '…';
}

function mockUnitReport(s: UnitSnapshot): Omit<UnitReport, 'generatedAt' | 'source'> {
  const critical = s.circles.filter((c) => c.status === 'critical');
  const monitoring = s.circles.filter((c) => c.status === 'monitoring');
  const attention = critical.map((c) => `${c.label} is critical — keep the team close`);
  const watch: string[] = [];
  for (const c of s.circles) {
    if (c.vitals && c.vitals.spo2 < 93) watch.push(`${c.label}: SpO₂ ${c.vitals.spo2}% — below target`);
    else if (c.vitals && c.vitals.pain >= 5) watch.push(`${c.label}: pain ${c.vitals.pain}/10`);
  }
  return {
    headline: `${s.unit}: ${critical.length} critical, ${monitoring.length} monitoring, ${s.openTaskCount} open tasks across ${s.circles.length} Circles.`,
    attention: attention.length ? attention.slice(0, 4) : ['No critical patients right now'],
    watch: watch.slice(0, 3),
    workload: [
      `${s.nursesOnline} of ${s.nursesTotal} nurses online`,
      `${s.openTaskCount} tasks open unit-wide`,
    ],
  };
}

function mockDebrief(tc: TrainingCase): string {
  const done = tc.tasks.filter((t) => t.status === 'done').length;
  const open = tc.tasks.length - done;
  return [
    'WHAT HAPPENED:',
    `${tc.caseLabel} — ${tc.reason}. The team logged ${tc.timeline.length} updates and ${tc.recordings.length} voice notes before discharge.`,
    'WHAT WENT WELL:',
    `${done} of ${tc.tasks.length} tasks were completed, and the Circle kept a running record the next shift could follow.`,
    'WHAT COULD BE IMPROVED:',
    open > 0
      ? `${open} task${open === 1 ? ' was' : 's were'} still open at discharge — next time, consider closing or handing these off explicitly.`
      : 'Nothing stands out from the record alone — review the timeline together for context the data can’t show.',
    'TEACHING POINTS:',
    'Connect a model backend for a full AI debrief of this case.',
  ].join('\n');
}

function mockAsk(circle: Circle, question: string): string {
  const v = circle.patient.vitals;
  const vitals = v ? `Latest vitals: HR ${v.hr}, BP ${v.bp}, SpO₂ ${v.spo2}%, Temp ${v.temp}°C.` : '';
  return `I can't reach the AI backend right now, so here's the record: ${circle.patient.name} is ${circle.status} — ${circle.reason}. ${vitals} (Your question: “${question}” — connect a model for a real answer.)`;
}
