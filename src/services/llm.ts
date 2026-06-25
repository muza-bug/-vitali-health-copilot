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

import type { Circle } from '../types/models';

export type AiSource = 'ai' | 'mock';
type LlmResponse =
  | { ok: true; connected: boolean }
  | { ok: true; text: string }
  | { ok: true; items: string[] }
  | { ok: false; reason: string; message?: string };

async function callApi(kind: string, payload?: unknown): Promise<LlmResponse> {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, payload }),
  });
  return (await res.json()) as LlmResponse;
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
