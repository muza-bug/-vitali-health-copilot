/* The context-first block: the full patient picture a nurse sees the moment a
   Circle opens — identity, reason, flags, vitals, and key notes, no scrolling
   or digging required. Reused on the Circle detail and handoff screens. */

import { ArrowDown, ArrowUp, Clock, Minus } from 'lucide-react';
import { timeAgo } from '../lib/format';
import type { Tone } from '../lib/meta';
import type { Circle, Vitals, VitalTrend } from '../types/models';
import { FlagChip } from './FlagChip';
import { PrivacyNote } from './PrivacyNote';
import { StatusBadge } from './StatusBadge';

/** Light out-of-range coloring so abnormal vitals read at a glance. */
function vitalTone(kind: keyof Vitals, v: Vitals): Tone {
  switch (kind) {
    case 'hr':
      return v.hr < 50 || v.hr > 110 ? 'danger' : v.hr < 60 || v.hr > 100 ? 'warn' : 'ok';
    case 'spo2':
      return v.spo2 < 92 ? 'danger' : v.spo2 < 95 ? 'warn' : 'ok';
    case 'temp':
      return v.temp >= 39 || v.temp < 35 ? 'danger' : v.temp >= 37.8 ? 'warn' : 'ok';
    case 'bp': {
      const sys = parseInt(v.bp, 10);
      return sys < 90 ? 'warn' : sys > 160 ? 'warn' : 'ok';
    }
    default:
      return 'neutral';
  }
}

const toneColor: Record<Tone, string> = {
  ok: 'var(--text)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--cyan)',
  neutral: 'var(--text)',
};

function TrendArrow({ trend }: { trend: VitalTrend }) {
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  return <Icon className="vital-trend" size={11} strokeWidth={2.8} aria-hidden="true" />;
}

function VitalTile({
  label,
  value,
  unit,
  tone,
  trend,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone: Tone;
  trend?: VitalTrend;
}) {
  const toneClass = tone === 'danger' ? 'is-danger' : tone === 'warn' ? 'is-warn' : '';
  return (
    <div className={`vital-tile ${toneClass}`}>
      <span className="vital-label">{label}</span>
      <span className="vital-value" style={{ color: toneColor[tone] }}>
        {value}
        {trend && <TrendArrow trend={trend} />}
        {unit && <span className="vital-unit"> {unit}</span>}
      </span>
    </div>
  );
}

export function PatientContext({ circle }: { circle: Circle }) {
  const p = circle.patient;
  const v = p.vitals;
  return (
    <section className="patient-context card card-pad animate-rise">
      <div className="row between gap-3">
        <span className="room-pill">Room {p.room}</span>
        <StatusBadge status={circle.status} />
      </div>

      <div className="patient-id">
        <h2 className="patient-name">{p.name}</h2>
        <span className="t-dim patient-meta">
          {/* Age/sex are unknown for quick-created Circles — show them only when real. */}
          {p.age > 0 && `${p.age} · ${p.sex} · `}MRN {p.mrn} · Admitted {timeAgo(p.admittedAt)}
        </span>
      </div>

      <p className="patient-reason">{circle.reason}</p>

      {p.flags.length > 0 && (
        <div className="row gap-2 flag-row">
          {p.flags.map((f, i) => (
            <FlagChip key={i} flag={f} />
          ))}
        </div>
      )}

      {v && (
        <>
          <div className="vitals-grid">
            <VitalTile label="HR" value={v.hr} unit="bpm" tone={vitalTone('hr', v)} trend={v.trends?.hr} />
            <VitalTile label="BP" value={v.bp} tone={vitalTone('bp', v)} trend={v.trends?.bp} />
            <VitalTile label="SpO₂" value={v.spo2} unit="%" tone={vitalTone('spo2', v)} trend={v.trends?.spo2} />
            <VitalTile label="Temp" value={v.temp} unit="°C" tone={vitalTone('temp', v)} trend={v.trends?.temp} />
          </div>
          <div className="vitals-sub t-faint">
            <Clock size={12} /> Resp {v.resp}/min · Pain {v.pain}/10 · taken {timeAgo(v.takenAt)}
          </div>
        </>
      )}

      {circle.notes.trim() && (
        <div className="context-notes">
          <div className="section-title">Key context</div>
          <p>{circle.notes}</p>
        </div>
      )}

      <PrivacyNote>Visible only to the nurses in this Circle.</PrivacyNote>
    </section>
  );
}
