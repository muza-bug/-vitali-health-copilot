/* Screen — a single training case. The full record of a discharged patient's
   Circle (timeline, tasks, recordings, final vitals) plus the Training coach's
   AI debrief: what happened, what went well, what could have been done better.
   Framed as education — reflection for the team, never a performance review. */

import {
  AlertTriangle,
  GraduationCap,
  ListChecks,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { trainingSessions } from '../data/demoContent';
import { FlagChip } from '../components/FlagChip';
import { ScreenHeader } from '../components/ScreenHeader';
import { Timeline } from '../components/Timeline';
import { generateDebrief, parseDebriefSections } from '../services/agents';
import { getAiHealth } from '../services/llm';
import { useApp } from '../store/AppContext';

export function TrainingCaseScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const app = useApp();
  const tc = app.getTrainingCase(id);
  const [generating, setGenerating] = useState(false);

  if (!tc || !app.currentNurse) {
    return (
      <div className="screen">
        <ScreenHeader title="Case" back backTo="/learn" />
        <p className="t-dim empty-line">This case is no longer available.</p>
      </div>
    );
  }

  const debrief = async () => {
    if (generating) return;
    setGenerating(true);
    const d = await generateDebrief(tc);
    await app.saveDebrief(tc.id, d);
    setGenerating(false);
  };

  const v = tc.finalVitals;
  const sections = tc.debrief ? parseDebriefSections(tc.debrief.text) : [];
  const doneTasks = tc.tasks.filter((t) => t.status === 'done');
  const credits = getAiHealth().creditsExhausted;

  return (
    <div className="screen">
      <ScreenHeader title={tc.caseLabel} subtitle={`${tc.unit} · discharged`} back backTo="/learn" />

      <div className="detail-body">
        {/* Deep link into the full web review when one exists for this Circle. */}
        {trainingSessions[tc.sourceCircleId] && (
          <button
            className="loop-link"
            onClick={() => navigate(`/training/session/${tc.sourceCircleId}`)}
          >
            <GraduationCap size={18} className="t-cyan" />
            <span style={{ flex: 1 }}>
              <b>Open the full session review</b>
              <span>Recording player, Vita's timestamped coaching, and team discussion.</span>
            </span>
          </button>
        )}

        {/* Case summary */}
        <section className="card card-pad">
          <div className="section-title">Case</div>
          <p className="case-reason">{tc.reason}</p>
          {tc.flags.length > 0 && (
            <div className="row gap-2 case-flags">
              {tc.flags.map((f) => (
                <FlagChip key={f.label} flag={f} />
              ))}
            </div>
          )}
          {v && (
            <p className="t-dim case-vitals">
              Final vitals: HR {v.hr} · BP {v.bp} · SpO₂ {v.spo2}% · Temp {v.temp}°C · Pain {v.pain}/10
            </p>
          )}
        </section>

        {/* AI debrief — the teaching layer */}
        <section className="card card-pad">
          <div className="row between">
            <div className="row gap-2">
              <GraduationCap size={16} className="t-cyan" />
              <span className="card-h">Training coach debrief</span>
            </div>
            <button className="link-btn" onClick={() => void debrief()} disabled={generating}>
              <RefreshCw size={14} className={generating ? 'spin' : ''} />{' '}
              {generating ? 'Reviewing…' : tc.debrief ? 'Regenerate' : 'Generate'}
            </button>
          </div>

          {credits && (
            <div className="credits-banner">
              <AlertTriangle size={15} />
              <span>
                Out of Claude credits — debriefs fall back to a basic summary. Top up in the
                Claude Console dashboard.
              </span>
            </div>
          )}

          {!tc.debrief ? (
            <p className="t-faint empty-line">
              {generating
                ? 'The Training coach is reading the full case…'
                : 'Generate a debrief: what happened, what went well, what could be improved.'}
            </p>
          ) : (
            <>
              {sections.map((s) => (
                <div key={s.title} className="debrief-section">
                  <span className="debrief-title">{s.title}</span>
                  <p className="debrief-body">{s.body}</p>
                </div>
              ))}
              <span className="t-faint assistant-foot">
                {tc.debrief.source === 'ai'
                  ? 'Vitali Training coach · educational reflection, not a performance review'
                  : 'On-device summary · connect a model for a full AI debrief'}
              </span>
            </>
          )}
        </section>

        {/* Recordings — walkie-talkie audio, kept as transcripts */}
        <section className="card card-pad">
          <div className="row gap-2">
            <Mic size={16} className="t-cyan" />
            <span className="card-h">Recordings · {tc.recordings.length}</span>
          </div>
          {tc.recordings.length === 0 ? (
            <p className="t-faint empty-line">No voice notes were recorded on this case.</p>
          ) : (
            <ul className="recording-list">
              {tc.recordings.map((r) => (
                <li key={r.at} className="recording-row">
                  <span className="t-faint recording-meta">
                    {app.getNurse(r.senderId)?.name ?? 'Nurse'} ·{' '}
                    {new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {r.durationSec}s
                  </span>
                  <p className="recording-text">
                    {r.transcript ?? <span className="t-faint">No transcript captured.</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tasks */}
        <section className="card card-pad">
          <div className="row gap-2">
            <ListChecks size={16} className="t-cyan" />
            <span className="card-h">
              Tasks · {doneTasks.length}/{tc.tasks.length} completed
            </span>
          </div>
          {tc.tasks.length === 0 ? (
            <p className="t-faint empty-line">No tasks were logged on this case.</p>
          ) : (
            <ul className="case-task-list">
              {tc.tasks.map((t) => (
                <li key={t.id} className={`case-task ${t.status === 'done' ? 'is-done' : ''}`}>
                  <span className="grow">{t.label}</span>
                  <span className="t-faint">{t.status === 'done' ? 'done' : 'left open'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Full activity record */}
        <section className="card card-pad">
          <div className="section-title">Full record</div>
          <Timeline entries={tc.timeline} getNurse={app.getNurse} currentNurseId={app.currentNurse.id} />
        </section>

        <section className="card card-pad privacy-banner">
          <span className="privacy-banner-icon">
            <ShieldCheck size={20} />
          </span>
          <div className="stack">
            <span className="privacy-banner-title">Kept for learning</span>
            <span className="t-dim">
              Case labels drop the patient's name, and the <Sparkles size={12} /> AI reads only
              what the Circle recorded. Debriefs are for teaching — decisions always belonged to
              the team on the floor.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
