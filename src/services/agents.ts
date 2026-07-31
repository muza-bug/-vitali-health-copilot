/* =============================================================================
   Vitali Health AI — the AI agent roster
   -----------------------------------------------------------------------------
   Three agents, all riding the pluggable LLM backend (services/llm.ts):

   • CARE ASSISTANT — proactive next steps + grounded Q&A on one Circle
     (AssistantPanel). Nothing it proposes is applied without a nurse's tap.
   • DATA AGENT — organizes what every nurse is logging into a real-time unit
     report (Insights screen), shareable to Slack via services/connectors.ts.
   • TRAINING COACH — debriefs discharged cases in the Learn tab: what
     happened, what went well, what could have been done better.

   Responsible-AI stance (enforced in the server system prompt, api/_llm.ts):
   grounded only in supplied data, no diagnoses or dosing, always defers to
   protocol and clinical judgment, and every output is labeled 'ai' or 'mock'.
   ============================================================================= */

import {
  aiDebrief,
  aiUnitReport,
  type UnitReport,
  type UnitSnapshot,
} from './llm';
import type {
  Circle,
  Nurse,
  Task,
  TimelineEntry,
  TrainingCase,
  TrainingDebrief,
} from '../types/models';

/* ----------------------------------------------------------------- data agent */

/**
 * Build the de-identified snapshot the Data agent reports on. Rooms and
 * clinical facts go in; patient names never do.
 */
export function buildUnitSnapshot(
  unit: string,
  circles: Circle[],
  tasks: Task[],
  timeline: TimelineEntry[],
  nurses: Nurse[],
): UnitSnapshot {
  const active = circles.filter((c) => c.status !== 'discharge');
  const openTasks = tasks.filter((t) => t.status === 'open');
  return {
    unit,
    nursesOnline: nurses.filter((n) => n.online).length,
    nursesTotal: nurses.length,
    openTaskCount: openTasks.length,
    circles: active.map((c) => {
      const v = c.patient.vitals;
      return {
        label: `Room ${c.patient.room} — ${c.reason}`,
        status: c.status,
        vitals: v
          ? { hr: v.hr, bp: v.bp, spo2: v.spo2, temp: v.temp, resp: v.resp, pain: v.pain }
          : undefined,
        openTasks: openTasks.filter((t) => t.circleId === c.id).map((t) => t.label),
        recentUpdates: timeline
          .filter((t) => t.circleId === c.id && (t.kind === 'note' || t.kind === 'vitals'))
          .slice(-3)
          .map((t) => t.text),
        teamSize: c.memberIds.length,
      };
    }),
  };
}

/** Run the Data agent: live unit snapshot in, prioritized report out. */
export async function generateUnitReport(
  unit: string,
  circles: Circle[],
  tasks: Task[],
  timeline: TimelineEntry[],
  nurses: Nurse[],
): Promise<UnitReport> {
  return aiUnitReport(buildUnitSnapshot(unit, circles, tasks, timeline, nurses));
}

/** Render a unit report as Slack-friendly text. */
export function reportToSlackText(report: UnitReport, unit: string): string {
  const lines = [
    `*Vitali unit report — ${unit}*`,
    report.headline,
    ...(report.attention.length ? ['*Needs attention:*', ...report.attention.map((a) => `• ${a}`)] : []),
    ...(report.watch.length ? ['*Watch:*', ...report.watch.map((w) => `• ${w}`)] : []),
    ...(report.workload.length ? ['*Workload:*', ...report.workload.map((w) => `• ${w}`)] : []),
  ];
  return lines.join('\n');
}

/* ------------------------------------------------------------- training coach */

/** Run the Training coach over a closed case and return its debrief. */
export async function generateDebrief(tc: TrainingCase): Promise<TrainingDebrief> {
  const { text, source } = await aiDebrief(tc);
  return { text, source, generatedAt: new Date().toISOString() };
}

/**
 * Split a debrief's plain-text sections for display. Unknown shapes fall back
 * to a single unlabeled section so nothing the model wrote is dropped.
 */
export function parseDebriefSections(text: string): { title: string; body: string }[] {
  const titles = ['WHAT HAPPENED', 'WHAT WENT WELL', 'WHAT COULD BE IMPROVED', 'TEACHING POINTS'];
  const pattern = new RegExp(`^(${titles.join('|')}):?\\s*$`, 'i');
  const sections: { title: string; body: string }[] = [];
  let current: { title: string; body: string } | null = null;
  for (const line of text.split('\n')) {
    const m = line.trim().match(pattern);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].toUpperCase(), body: '' };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    } else if (line.trim()) {
      current = { title: 'DEBRIEF', body: line };
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ ...s, body: s.body.trim() })).filter((s) => s.body);
}
