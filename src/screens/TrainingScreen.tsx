/* Screen — Learn. When a patient is discharged, their whole Circle record
   (timeline, tasks, recordings, vitals) is archived here as a de-identified
   case so other nurses can study how it was handled — with the Training coach
   (AI) explaining what happened and what could have been done better. */

import { ChevronRight, GraduationCap, ListChecks, MessagesSquare, Mic, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import type { TrainingCase } from '../types/models';

function CaseCard({ tc, onOpen }: { tc: TrainingCase; onOpen: () => void }) {
  const closed = new Date(tc.closedAt);
  return (
    <button className="card card-pad case-card" onClick={onOpen}>
      <div className="stack grow case-card-text">
        <span className="case-label">{tc.caseLabel}</span>
        <span className="t-faint case-when">
          Discharged {closed.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {tc.unit}
        </span>
        <div className="row gap-3 case-counts">
          <span className="t-dim"><MessagesSquare size={13} /> {tc.timeline.length} updates</span>
          <span className="t-dim"><ListChecks size={13} /> {tc.tasks.length} tasks</span>
          <span className="t-dim"><Mic size={13} /> {tc.recordings.length} recordings</span>
        </div>
        {tc.debrief && (
          <span className="chip chip-cyan case-debrief-chip">
            <Sparkles size={12} /> AI debrief ready
          </span>
        )}
      </div>
      <ChevronRight size={18} className="t-faint" />
    </button>
  );
}

export function TrainingScreen() {
  const { training } = useApp();
  const navigate = useNavigate();

  return (
    <div className="screen animate-fade">
      <header className="home-top">
        <h1 className="home-greeting">Learn</h1>
        <p className="t-dim home-date">Closed cases, kept so the whole team learns from them</p>
      </header>

      <section className="card card-pad how-it-works">
        <div className="row gap-2">
          <GraduationCap size={16} className="t-cyan" />
          <span className="card-h">How cases get here</span>
        </div>
        <p className="t-dim">
          When a patient is discharged, everything their Circle recorded — updates, vitals, tasks,
          voice notes — moves into this tab. The AI Training coach walks through each case: what
          happened, what went well, and what could be done better next time.
        </p>
      </section>

      {training.length === 0 ? (
        <section className="card card-pad">
          <p className="t-dim empty-line">
            No cases yet. Set a Circle's status to <b>Discharge</b> and it will be archived here
            for the team to learn from.
          </p>
        </section>
      ) : (
        <div className="case-list">
          {training.map((tc) => (
            <CaseCard key={tc.id} tc={tc} onOpen={() => navigate(`/learn/${tc.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
