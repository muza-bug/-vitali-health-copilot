/* =============================================================================
   Training home — Maria's personalized dashboard: progress, "from your shifts",
   "learn from your team", and the featured most-learned-from lesson.
   Content: src/data/demoContent.ts, keyed to the same Circles as the live app.
   ============================================================================= */

import { GraduationCap, ListChecks, MessagesSquare, Mic, Sparkles, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { scaleStory, trainingHome, trainingSessions } from '../data/demoContent';
import { DemoFooter } from './DemoShell';

export function TrainingHome() {
  const navigate = useNavigate();
  const a = trainingSessions.c214;
  const b = trainingSessions.c118;

  return (
    <>
      <div className="dp">
        <h1>Good morning, Maria</h1>
        <p className="dp-sub">
          {trainingHome.reviewedThisWeek} of your shifts were reviewed this week. Your coach found
          a few minutes worth revisiting.
        </p>

        {/* featured lesson */}
        <div className="card tr-featured">
          <div className="tr-featured-in">
            <div className="tr-featured-copy">
              <span className="chip chip-ok"><Star size={12} /> Featured lesson · most learned-from this month</span>
              <h2>{b.title} — handled the way it should go</h2>
              <p>
                James Okafor's team placed the IV in 11 minutes with zero repeated questions. Watch
                how staging, handoffs, and shared context fit together — then Vita turns it into
                habits you can use tonight.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              <span className="tr-badge">
                <GraduationCap size={15} /> {scaleStory.nursesTrained.toLocaleString()} nurses trained from this
              </span>
              <button className="btn btn-primary" onClick={() => navigate('/training/session/c118')}>
                Watch the lesson ▸
              </button>
            </div>
          </div>
        </div>

        {/* progress */}
        <div className="tr-stats">
          {trainingHome.stats.map((s) => (
            <div className="card dstat" key={s.lbl}>
              <div className="num">{s.num}</div>
              <div className="lbl">{s.lbl}</div>
              <div className={`sub ${s.quiet ? 'quiet' : ''}`}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* feeds */}
        <div className="tr-feeds">
          <div className="card card-pad tr-feed">
            <h3>From your shifts</h3>
            <p className="fsub">Circles you were part of, reviewed by your coach.</p>
            <button className="tr-sess" onClick={() => navigate('/training/session/c214')}>
              <span className="tr-sess-dot review" aria-hidden="true">⚡</span>
              <span className="tr-sess-body">
                <span className="tr-sess-title">{a.title}</span>
                <span className="tr-sess-meta">Tuesday night · 4 nurses · 3 coaching moments found</span>
              </span>
              <span className="tr-sess-cta">Review ▸</span>
            </button>
            <button className="tr-sess" onClick={() => navigate('/learn')}>
              <span className="tr-sess-dot plain" aria-hidden="true">✓</span>
              <span className="tr-sess-body">
                <span className="tr-sess-title">All your archived cases</span>
                <span className="tr-sess-meta">Open the in-app Learn tab — the nurse's view of the same records</span>
              </span>
              <span className="tr-sess-cta">Open ▸</span>
            </button>
          </div>
          <div className="card card-pad tr-feed">
            <h3>Learn from your team</h3>
            <p className="fsub">Exemplary Circles from other nurses, turned into lessons.</p>
            <button className="tr-sess" onClick={() => navigate('/training/session/c118')}>
              <span className="tr-sess-dot lesson" aria-hidden="true">★</span>
              <span className="tr-sess-body">
                <span className="tr-sess-title">{b.title}</span>
                <span className="tr-sess-meta">James Okafor, RN · {scaleStory.nursesTrained.toLocaleString()} nurses trained · 4.9★</span>
              </span>
              <span className="tr-sess-cta">Learn ▸</span>
            </button>
            {trainingHome.teamFeedExtras.map((s) => (
              <button className="tr-sess" key={s.title} onClick={() => navigate('/training/session/c118')}>
                <span className="tr-sess-dot lesson" aria-hidden="true">★</span>
                <span className="tr-sess-body">
                  <span className="tr-sess-title">{s.title}</span>
                  <span className="tr-sess-meta">{s.meta}</span>
                </span>
                <span className="tr-sess-cta">Learn ▸</span>
              </button>
            ))}
          </div>
        </div>

        {/* scale teaser */}
        <div className="card card-pad" style={{ marginTop: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Sparkles size={18} className="t-cyan" />
          <div style={{ flex: 1, minWidth: 240 }}>
            <b>How one shift trains thousands</b>
            <p className="t-dim" style={{ fontSize: 13.5, marginTop: 3 }}>
              The Room 118 lesson has reached {scaleStory.nursesTrained.toLocaleString()} nurses across{' '}
              {scaleStory.hospitals} hospitals — see the multiplier.
            </p>
          </div>
          <Link className="btn btn-secondary" to="/training/scale">See the scale ▸</Link>
        </div>

        <p className="t-faint" style={{ fontSize: 12, marginTop: 22, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span><MessagesSquare size={12} /> Reviews are discussion, not evaluation</span>
          <span><ListChecks size={12} /> Metrics come from the shift's own Circle</span>
          <span><Mic size={12} /> Recordings stay inside your team</span>
        </p>
      </div>
      <DemoFooter />
    </>
  );
}
