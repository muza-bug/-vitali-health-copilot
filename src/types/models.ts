/* =============================================================================
   Vitali Health AI — Domain model
   The single source of truth for every entity the app passes around. Services,
   the store, and the UI all speak these types so the data layer can be swapped
   for a real backend without touching screens.
   ============================================================================= */

export type ID = string;

/* -------------------------------------------------------------------- Nurses */

export interface Nurse {
  id: ID;
  name: string;
  initials: string;
  role: string;
  unit: string;
  /** Hue (0–360) used to tint the gradient avatar. */
  avatarHue: number;
  online: boolean;
  /** 4-digit ID code teammates use to find each other. */
  code: string;
  /** Short free-text status the team sees, e.g. "Covering rooms 410–418". */
  statusNote?: string;
}

export interface Shift {
  id: ID;
  nurseId: ID;
  unit: string;
  startsAt: string;
  endsAt: string;
  label: string;
}

/* ------------------------------------------------------------------ Patients */

export type PatientFlagKind =
  | 'allergy'
  | 'fall-risk'
  | 'dnr'
  | 'isolation'
  | 'npo'
  | 'critical';

export interface PatientFlag {
  kind: PatientFlagKind;
  label: string;
}

export type VitalTrend = 'up' | 'down' | 'steady';

export interface Vitals {
  hr: number;
  /** Blood pressure as "sys/dia", e.g. "124/79". */
  bp: string;
  spo2: number;
  temp: number;
  resp: number;
  pain: number;
  takenAt: string;
  /** Optional short-term direction per metric, for the trend arrows. */
  trends?: {
    hr?: VitalTrend;
    bp?: VitalTrend;
    spo2?: VitalTrend;
    temp?: VitalTrend;
  };
}

export interface Patient {
  id: ID;
  name: string;
  room: string;
  mrn: string;
  /** 0 when unknown (quick-created Circles); the UI hides 0 age/sex. */
  age: number;
  sex: 'F' | 'M' | 'X';
  admittedAt: string;
  flags: PatientFlag[];
  vitals?: Vitals;
}

/* ------------------------------------------------------------------- Circles */

export type CircleStatus =
  | 'stable'
  | 'monitoring'
  | 'critical'
  | 'handoff'
  | 'discharge';

export interface Circle {
  id: ID;
  reason: string;
  notes: string;
  status: CircleStatus;
  createdBy: ID;
  createdAt: string;
  lastUpdateAt: string;
  memberIds: ID[];
  /** Transient flag: pulses the card when something just happened live. */
  hasLiveActivity?: boolean;
  patient: Patient;
}

/* ------------------------------------------------------------------ Timeline */

export type TimelineKind =
  | 'note'
  | 'status'
  | 'task-open'
  | 'task-done'
  | 'join'
  | 'voice'
  | 'vitals';

export interface TimelineEntry {
  id: ID;
  circleId: ID;
  authorId: ID;
  kind: TimelineKind;
  text: string;
  createdAt: string;
  /** Set on task-done entries — how long the task took. */
  durationMs?: number;
  /** Set on voice entries — links to the VoiceMessage. */
  voiceMessageId?: ID;
}

/* --------------------------------------------------------------------- Tasks */

export type TaskCategory =
  | 'medication'
  | 'assessment'
  | 'mobility'
  | 'documentation'
  | 'comfort'
  | 'coordination';

export type TaskStatus = 'open' | 'done';

export interface Task {
  id: ID;
  circleId: ID;
  label: string;
  category: TaskCategory;
  createdBy: ID;
  assigneeId?: ID;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
}

/* ------------------------------------------------------------- Voice messages */

export type VoiceStatus = 'sending' | 'sent' | 'played';

export interface VoiceMessage {
  id: ID;
  circleId: ID;
  senderId: ID;
  durationSec: number;
  createdAt: string;
  transcript: string | null;
  audioUrl: string | null;
  status: VoiceStatus;
}

/* ------------------------------------------------------ De-identified metrics */

export type MetricType =
  | 'task_completion'
  | 'handoff_time'
  | 'response_time'
  | 'circle_setup';

export interface ProcessMetric {
  id: ID;
  type: MetricType;
  category: TaskCategory | 'general';
  /** De-identified unit label only, e.g. "4 West". No patient/nurse identity. */
  unit: string;
  durationMs: number;
  capturedAt: string;
}

export interface AggregateInsight {
  id: ID;
  type: MetricType;
  label: string;
  value: string;
  caption: string;
  /** Percent change vs the prior window (negative = faster). */
  deltaPct: number;
  lowerIsBetter: boolean;
  sampleSize: number;
  /** Recent trend, oldest → newest, for the sparkline. */
  series: number[];
}
