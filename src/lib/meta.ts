/* =============================================================================
   Vitali Health AI — Presentation metadata
   Maps domain enums (status, flags, task categories) to labels, tones, and icons
   so every screen renders them identically.
   ============================================================================= */

import {
  Activity,
  AlertTriangle,
  Ban,
  FileText,
  Heart,
  HeartPulse,
  Pill,
  ShieldAlert,
  Siren,
  Stethoscope,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { CircleStatus, PatientFlagKind, TaskCategory } from '../types/models';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

/** Maps a tone to the chip + dot utility classes in global.css. */
export const toneChip: Record<Tone, string> = {
  ok: 'chip-ok',
  warn: 'chip-warn',
  danger: 'chip-danger',
  info: 'chip-cyan',
  neutral: '',
};
export const toneDot: Record<Tone, string> = {
  ok: 'dot-ok',
  warn: 'dot-warn',
  danger: 'dot-danger',
  info: 'dot-ok',
  neutral: '',
};

/** Maps a tone to its CSS color variable (for inline accents like edge bars). */
export const toneVar: Record<Tone, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--cyan)',
  neutral: 'var(--text-faint)',
};

export const statusMeta: Record<CircleStatus, { label: string; tone: Tone }> = {
  stable: { label: 'Stable', tone: 'ok' },
  monitoring: { label: 'Monitoring', tone: 'warn' },
  critical: { label: 'Critical', tone: 'danger' },
  handoff: { label: 'Handoff', tone: 'info' },
  discharge: { label: 'Discharge', tone: 'neutral' },
};

/** The order statuses appear in the change-status control. */
export const STATUS_OPTIONS: CircleStatus[] = [
  'stable',
  'monitoring',
  'critical',
  'handoff',
  'discharge',
];

export const flagMeta: Record<PatientFlagKind, { tone: Tone; Icon: LucideIcon }> = {
  allergy: { tone: 'danger', Icon: Ban },
  'fall-risk': { tone: 'warn', Icon: AlertTriangle },
  dnr: { tone: 'neutral', Icon: HeartPulse },
  isolation: { tone: 'warn', Icon: ShieldAlert },
  npo: { tone: 'warn', Icon: Utensils },
  critical: { tone: 'danger', Icon: Siren },
};

export const taskCategoryMeta: Record<
  TaskCategory,
  { label: string; Icon: LucideIcon }
> = {
  medication: { label: 'Medication', Icon: Pill },
  assessment: { label: 'Assessment', Icon: Stethoscope },
  mobility: { label: 'Mobility', Icon: Activity },
  documentation: { label: 'Documentation', Icon: FileText },
  comfort: { label: 'Comfort', Icon: Heart },
  coordination: { label: 'Coordination', Icon: Users },
};

export const TASK_CATEGORY_OPTIONS = Object.keys(taskCategoryMeta) as TaskCategory[];
