/* =============================================================================
   About / The technology — the one place technical framing lives (kept out of
   the nurse-facing UI entirely). Written to be credible and specific.
   ============================================================================= */

import { Cpu, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DemoFooter } from './DemoShell';

export function AboutPage() {
  return (
    <>
      <div className="dp">
        <div className="dp-label">About Vitali</div>
        <h1>The technology, plainly</h1>
        <p className="dp-sub">
          What's real today, how the training engine works, and where it goes as data accumulates.
        </p>

        <div className="about-cols">
          <div className="card card-pad">
            <h3><Cpu size={16} className="t-cyan" style={{ verticalAlign: -2 }} /> The training engine</h3>
            <p>
              Vitali's coordination layer produces something rare: <b>a structured, timestamped
              record of how clinical teamwork actually happened</b> — who knew what when, how long
              each task took, what was said on the walkie, where handoffs held or leaked.
            </p>
            <ul className="pipeline">
              <li><span className="pipe-n">1</span><div><b>Transcribe</b><p>Walkie-talkie audio becomes text, aligned to the session clock.</p></div></li>
              <li><span className="pipe-n">2</span><div><b>Interpret</b><p>Transcripts are read against the structured event timeline — tasks, handoffs, status changes — to reconstruct what happened.</p></div></li>
              <li><span className="pipe-n">3</span><div><b>Compare</b><p>The run is scored against best-practice benchmarks built from thousands of similar cases.</p></div></li>
              <li><span className="pipe-n">4</span><div><b>Coach</b><p>The gap between this run and the benchmark becomes timestamped, personalized coaching — and exemplary runs become distributable lessons.</p></div></li>
            </ul>
            <p style={{ marginTop: 14 }}>
              <b>Direction of travel:</b> today the pipeline runs on general-purpose models with a
              pluggable backend (hosted or fully local). As anonymized workflow data accumulates
              across floors and hospitals, the same pipeline is designed to move toward
              domain-specific models trained on clinical process data — the benchmarks, the
              coaching, and the lesson extraction all improve with scale.
            </p>
          </div>

          <div>
            <div className="card card-pad">
              <h3><ShieldCheck size={16} style={{ color: 'var(--ok)', verticalAlign: -2 }} /> What's real in this demo</h3>
              <p>
                This is a <b>functional demo on sample data</b>. The app, the Circles, the training
                reviews, and the dashboards all work — but every patient, nurse, and number is
                fictional, and the AI coaching shown here was generated for these sample cases.
                No real clinical data has been collected. We'd rather be exact about what exists
                than impressive about what doesn't.
              </p>
              <p>
                What exists in the codebase today: the full nurse-facing app (Circles, walkie,
                handoffs, tasks, live vitals simulation), the AI service layer with a pluggable
                model backend, the training review surfaces, and clearly marked integration seams
                for EHR, SSO, real-time sync, and the analytics pipeline.
              </p>
            </div>
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <h3>See it, don't read about it</h3>
              <p style={{ marginBottom: 12 }}>The demo is the argument:</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link className="btn btn-secondary" to="/shift">Live app</Link>
                <Link className="btn btn-secondary" to="/training/session/c214">An AI review</Link>
                <Link className="btn btn-secondary" to="/impact">Hospital impact</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DemoFooter />
    </>
  );
}
