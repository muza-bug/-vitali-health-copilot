/* =============================================================================
   Vitali Health AI — Data service (THE single seam to a real backend)
   -----------------------------------------------------------------------------
   Every server-dependent read/write in the app goes through this module. Today
   it is backed by an in-memory copy of the mock seed data so the prototype is
   fully interactive offline. To go live, replace each method body with a real
   `fetch(...)` (or your client of choice) — the signatures and return shapes are
   designed to stay identical.

   >>> TODO: connect real API here. Swap the in-memory store for HTTP calls. <<<
   ============================================================================= */

import {
  aggregateInsights as seedInsights,
  circles as seedCircles,
  currentShift as seedShift,
  CURRENT_NURSE_ID,
  nurses as seedNurses,
  processMetrics as seedMetrics,
  tasks as seedTasks,
  timeline as seedTimeline,
  voiceMessages as seedVoice,
} from '../data/mockData';
import type {
  AggregateInsight,
  Circle,
  CircleStatus,
  ID,
  Nurse,
  PatientFlag,
  ProcessMetric,
  Shift,
  Task,
  TaskCategory,
  TimelineEntry,
  TrainingCase,
  TrainingDebrief,
  Vitals,
  VoiceMessage,
} from '../types/models';
import { captureMetric } from './analytics';

/* ------------------------------------------------- local persistence helpers */
/* Training cases and profile photos survive reloads via localStorage until a
   real backend takes over. Everything else stays in-memory (demo data). */

const TRAINING_KEY = 'vitali.training.cases';
const photoKey = (nurseId: ID) => `vitali.profile.photo.${nurseId}`;

function loadTraining(): TrainingCase[] {
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    if (raw) return JSON.parse(raw) as TrainingCase[];
  } catch {
    /* fall through */
  }
  return [];
}

function persistTraining(cases: TrainingCase[]): void {
  try {
    localStorage.setItem(TRAINING_KEY, JSON.stringify(cases));
  } catch {
    /* storage full/blocked — cases stay in-memory for this session */
  }
}

function loadPhoto(nurseId: ID): string | undefined {
  try {
    return localStorage.getItem(photoKey(nurseId)) ?? undefined;
  } catch {
    return undefined;
  }
}

/* ----------------------------------------------------------- In-memory store */
/* Deep-cloned from the seed so mutations during a demo don't corrupt the seed. */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const store = {
  nurses: clone(seedNurses) as Nurse[],
  shift: clone(seedShift) as Shift,
  circles: clone(seedCircles) as Circle[],
  timeline: clone(seedTimeline) as TimelineEntry[],
  tasks: clone(seedTasks) as Task[],
  voice: clone(seedVoice) as VoiceMessage[],
  insights: clone(seedInsights) as AggregateInsight[],
  metrics: clone(seedMetrics) as ProcessMetric[],
  training: loadTraining(),
};

/* ------------------------------------------------------------------- Helpers */
/** Simulate network latency so loading states behave like the real thing. */
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
let idSeq = 1000;
const uid = (prefix: string) => `${prefix}${idSeq++}`;

/** Sort order for the home list: critical first, then most-recently active. */
const STATUS_RANK: Record<CircleStatus, number> = {
  critical: 0,
  handoff: 1,
  monitoring: 2,
  stable: 3,
  discharge: 4,
};
function sortCircles(list: Circle[]): Circle[] {
  return [...list].sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) {
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    }
    return b.lastUpdateAt.localeCompare(a.lastUpdateAt);
  });
}

/* =============================================================================
   Reads
   ============================================================================= */

export const api = {
  /** One round-trip to hydrate the app after login. */
  async bootstrap(): Promise<{
    currentNurse: Nurse;
    shift: Shift;
    nurses: Nurse[];
    circles: Circle[];
    timeline: TimelineEntry[];
    tasks: Task[];
    voice: VoiceMessage[];
    training: TrainingCase[];
  }> {
    await delay();
    // Re-attach locally persisted profile photos before handing state out.
    for (const n of store.nurses) {
      const photo = loadPhoto(n.id);
      if (photo) n.photoUrl = photo;
    }
    const currentNurse = store.nurses.find((n) => n.id === CURRENT_NURSE_ID)!;
    return {
      currentNurse: clone(currentNurse),
      shift: clone(store.shift),
      nurses: clone(store.nurses),
      circles: sortCircles(store.circles),
      timeline: clone(store.timeline),
      tasks: clone(store.tasks),
      voice: clone(store.voice),
      training: clone(store.training),
    };
  },

  async getInsights(): Promise<AggregateInsight[]> {
    await delay();
    return clone(store.insights);
  },

  /** De-identified raw process metrics, for illustrative on-device breakdowns. */
  async getProcessMetrics(): Promise<ProcessMetric[]> {
    await delay();
    return clone(store.metrics);
  },

  /* ===========================================================================
     Writes — each returns the entities it touched so callers can patch state.
     =========================================================================== */

  /** First nurse creates a Circle. Captures a `circle_setup` process metric. */
  async createCircle(input: {
    patientName: string;
    room: string;
    reason: string;
    notes: string;
    status: CircleStatus;
    allergies: string[];
    memberIds: ID[];
    createdBy: ID;
    setupMs?: number;
    // Optional richer context (e.g. pulled from the EHR).
    age?: number;
    sex?: 'F' | 'M' | 'X';
    mrn?: string;
    vitals?: Vitals;
    flags?: PatientFlag[];
  }): Promise<{ circle: Circle; entry: TimelineEntry }> {
    await delay();
    const circleId = uid('c');
    // Prefer EHR-provided flags; otherwise derive them from typed allergies.
    const flags =
      input.flags ??
      input.allergies.filter(Boolean).map((label) => ({ kind: 'allergy' as const, label }));

    const circle: Circle = {
      id: circleId,
      reason: input.reason,
      notes: input.notes,
      status: input.status,
      createdBy: input.createdBy,
      createdAt: now(),
      lastUpdateAt: now(),
      memberIds: Array.from(new Set([input.createdBy, ...input.memberIds])),
      patient: {
        id: uid('p'),
        name: input.patientName,
        room: input.room,
        mrn: input.mrn ?? '•••' + Math.floor(1000 + Math.random() * 8999),
        age: input.age ?? 0,
        sex: input.sex ?? 'X',
        admittedAt: now(),
        flags,
        vitals: input.vitals,
      },
    };
    store.circles.push(circle);

    const entry: TimelineEntry = {
      id: uid('t'),
      circleId,
      authorId: input.createdBy,
      kind: 'join',
      text: 'opened this Circle',
      createdAt: now(),
    };
    store.timeline.push(entry);

    // Process-metrics seam: how long Circle setup took (de-identified).
    captureMetric({
      type: 'circle_setup',
      category: 'general',
      unit: store.shift.unit.split(' — ')[0],
      durationMs: input.setupMs ?? 45_000,
    });

    return { circle: clone(circle), entry: clone(entry) };
  },

  /** Add a free-text update to a Circle's timeline. */
  async addUpdate(
    circleId: ID,
    authorId: ID,
    text: string,
  ): Promise<{ entry: TimelineEntry; lastUpdateAt: string }> {
    await delay(160);
    const entry: TimelineEntry = {
      id: uid('t'),
      circleId,
      authorId,
      kind: 'note',
      text: text.trim(),
      createdAt: now(),
    };
    store.timeline.push(entry);
    const circle = store.circles.find((c) => c.id === circleId);
    if (circle) circle.lastUpdateAt = entry.createdAt;
    return { entry: clone(entry), lastUpdateAt: entry.createdAt };
  },

  /** Change a Circle's status, recording it on the timeline. */
  async changeStatus(
    circleId: ID,
    status: CircleStatus,
    authorId: ID,
  ): Promise<{ entry: TimelineEntry; status: CircleStatus; lastUpdateAt: string }> {
    await delay(140);
    const circle = store.circles.find((c) => c.id === circleId);
    if (circle) {
      circle.status = status;
      circle.lastUpdateAt = now();
    }
    const entry: TimelineEntry = {
      id: uid('t'),
      circleId,
      authorId,
      kind: 'status',
      text: `changed status to ${status}`,
      createdAt: now(),
    };
    store.timeline.push(entry);
    return { entry: clone(entry), status, lastUpdateAt: entry.createdAt };
  },

  /** Add a task to a Circle. */
  async addTask(input: {
    circleId: ID;
    label: string;
    category: TaskCategory;
    createdBy: ID;
    assigneeId?: ID;
  }): Promise<{ task: Task; entry: TimelineEntry }> {
    await delay(140);
    const task: Task = {
      id: uid('tk'),
      circleId: input.circleId,
      label: input.label.trim(),
      category: input.category,
      createdBy: input.createdBy,
      assigneeId: input.assigneeId,
      status: 'open',
      createdAt: now(),
    };
    store.tasks.push(task);
    const entry: TimelineEntry = {
      id: uid('t'),
      circleId: input.circleId,
      authorId: input.createdBy,
      kind: 'task-open',
      text: input.label.trim(),
      createdAt: now(),
    };
    store.timeline.push(entry);
    const circle = store.circles.find((c) => c.id === input.circleId);
    if (circle) circle.lastUpdateAt = entry.createdAt;
    return { task: clone(task), entry: clone(entry) };
  },

  /**
   * Mark a task done. Quietly records how long it took and emits a de-identified
   * `task_completion` process metric — the metric the long-term product learns from.
   */
  async completeTask(
    taskId: ID,
    byNurseId: ID,
  ): Promise<{ task: Task; entry: TimelineEntry } | null> {
    await delay(160);
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'done') return null;

    const completedAt = now();
    const durationMs =
      new Date(completedAt).getTime() - new Date(task.createdAt).getTime();
    task.status = 'done';
    task.completedAt = completedAt;
    task.durationMs = durationMs;

    const entry: TimelineEntry = {
      id: uid('t'),
      circleId: task.circleId,
      authorId: byNurseId,
      kind: 'task-done',
      text: task.label,
      createdAt: completedAt,
      durationMs,
    };
    store.timeline.push(entry);
    const circle = store.circles.find((c) => c.id === task.circleId);
    if (circle) circle.lastUpdateAt = completedAt;

    // Process-metrics seam — de-identified (no patient/nurse id leaves here).
    captureMetric({
      type: 'task_completion',
      category: task.category,
      unit: store.shift.unit.split(' — ')[0],
      durationMs,
    });

    return { task: clone(task), entry: clone(entry) };
  },

  /** A nurse joins an existing Circle. */
  async joinCircle(
    circleId: ID,
    nurseId: ID,
  ): Promise<{ memberIds: ID[]; entry: TimelineEntry }> {
    await delay(160);
    const circle = store.circles.find((c) => c.id === circleId);
    if (circle && !circle.memberIds.includes(nurseId)) {
      circle.memberIds.push(nurseId);
      circle.lastUpdateAt = now();
    }
    const entry: TimelineEntry = {
      id: uid('t'),
      circleId,
      authorId: nurseId,
      kind: 'join',
      text: 'joined the Circle',
      createdAt: now(),
    };
    store.timeline.push(entry);
    return { memberIds: clone(circle?.memberIds ?? []), entry: clone(entry) };
  },

  /**
   * Persist a voice clip's metadata after the push-to-talk transport "sends" it.
   * (The audio bytes themselves are handled by services/voice.ts.)
   */
  async recordVoiceMessage(input: {
    circleId: ID;
    senderId: ID;
    durationSec: number;
    transcript?: string | null;
    audioUrl?: string | null;
  }): Promise<{ voice: VoiceMessage; entry: TimelineEntry }> {
    await delay(120);
    const voice: VoiceMessage = {
      id: uid('v'),
      circleId: input.circleId,
      senderId: input.senderId,
      durationSec: input.durationSec,
      createdAt: now(),
      transcript: input.transcript ?? null,
      audioUrl: input.audioUrl ?? null,
      status: 'sent',
    };
    store.voice.push(voice);
    const entry: TimelineEntry = {
      id: uid('t'),
      circleId: input.circleId,
      authorId: input.senderId,
      kind: 'voice',
      text: 'sent a voice message',
      createdAt: voice.createdAt,
      voiceMessageId: voice.id,
    };
    store.timeline.push(entry);
    const circle = store.circles.find((c) => c.id === input.circleId);
    if (circle) circle.lastUpdateAt = voice.createdAt;
    return { voice: clone(voice), entry: clone(entry) };
  },

  /** Add a teammate to a Circle by their nurse ID (the 4-digit code flow). */
  async addMember(
    circleId: ID,
    nurseId: ID,
  ): Promise<{ memberIds: ID[]; entry: TimelineEntry }> {
    await delay(160);
    const circle = store.circles.find((c) => c.id === circleId);
    if (circle && !circle.memberIds.includes(nurseId)) {
      circle.memberIds.push(nurseId);
      circle.lastUpdateAt = now();
    }
    const entry: TimelineEntry = {
      id: uid('t'),
      circleId,
      authorId: nurseId,
      kind: 'join',
      text: 'was added to the Circle by ID',
      createdAt: now(),
    };
    store.timeline.push(entry);
    return { memberIds: clone(circle?.memberIds ?? []), entry: clone(entry) };
  },

  /** Set (or clear) a nurse's profile photo. Persisted locally per device. */
  async setPhoto(nurseId: ID, photoUrl: string | null): Promise<void> {
    const nurse = store.nurses.find((n) => n.id === nurseId);
    if (nurse) nurse.photoUrl = photoUrl ?? undefined;
    try {
      if (photoUrl) localStorage.setItem(photoKey(nurseId), photoUrl);
      else localStorage.removeItem(photoKey(nurseId));
    } catch {
      /* storage full/blocked — photo stays session-only */
    }
  },

  /* ===========================================================================
     Training — discharged cases become teaching material (Learn tab).
     =========================================================================== */

  /**
   * Archive a discharged Circle as a training case: the whole record —
   * timeline, tasks, recordings, final vitals — moves to the Learn tab so
   * other nurses can study it. The caller passes its live state slices (they
   * include monitor-generated entries the store never saw). Idempotent per
   * Circle. The case label is de-identified: no patient name.
   */
  async archiveCase(input: {
    circle: Circle;
    timeline: TimelineEntry[];
    tasks: Task[];
    voice: VoiceMessage[];
    unit: string;
  }): Promise<TrainingCase> {
    await delay(120);
    const existing = store.training.find((t) => t.sourceCircleId === input.circle.id);
    if (existing) return clone(existing);

    const p = input.circle.patient;
    const tc: TrainingCase = {
      id: uid('tc'),
      sourceCircleId: input.circle.id,
      caseLabel:
        p.age > 0 ? `${p.age}${p.sex} — ${input.circle.reason}` : `Room ${p.room} — ${input.circle.reason}`,
      reason: input.circle.reason,
      unit: input.unit,
      outcome: 'discharged',
      admittedAt: p.admittedAt,
      closedAt: now(),
      flags: clone(p.flags),
      finalVitals: p.vitals ? clone(p.vitals) : undefined,
      timeline: clone(
        [...input.timeline].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      ),
      tasks: clone(input.tasks),
      recordings: input.voice.map((v) => ({
        at: v.createdAt,
        senderId: v.senderId,
        durationSec: v.durationSec,
        transcript: v.transcript,
      })),
    };
    store.training.unshift(tc);
    persistTraining(store.training);
    return clone(tc);
  },

  /** Attach the Training coach's AI debrief to a case. */
  async saveDebrief(caseId: ID, debrief: TrainingDebrief): Promise<void> {
    const tc = store.training.find((t) => t.id === caseId);
    if (!tc) return;
    tc.debrief = clone(debrief);
    persistTraining(store.training);
  },
};

export type Api = typeof api;
