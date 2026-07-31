/* =============================================================================
   Landing — the front door. Plain-language pitch, the problem, the loop diagram
   (the one idea the whole demo exists to communicate), feature strip that links
   into the live surfaces, and the privacy stance up front.
   ============================================================================= */

import {
  ArrowLeftRight,
  BarChart3,
  GraduationCap,
  MessageSquareOff,
  Radio,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTour } from './Tour';
import { DemoFooter } from './DemoShell';

/** The core loop, drawn as one continuous cycle. Reveals on scroll. */
function LoopDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && el.classList.add('seen'),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const nodes = [
    { x: 60, title: 'A Circle on the floor', sub: 'Shared context · walkie · timeline', color: 'var(--cyan)' },
    { x: 285, title: 'Recorded shift data', sub: 'Timings · handoffs · audio', color: 'var(--brand-teal)' },
    { x: 510, title: 'AI review & training', sub: 'Vita coaches every session', color: 'var(--brand-green)' },
    { x: 735, title: 'Better nurses', sub: 'Habits spread floor-wide', color: 'var(--brand-orange)' },
  ];

  return (
    <div className="loop-wrap" ref={ref}>
      <svg className="loop-svg" viewBox="0 0 940 250" role="img"
        aria-label="The Vitali loop: a Circle on the floor produces recorded shift data, the AI turns it into training, training makes nurses better, and better nurses produce better data — repeating every shift.">
        <defs>
          <linearGradient id="loopgrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b3fe0" />
            <stop offset="0.45" stopColor="#2bb8c4" />
            <stop offset="0.8" stopColor="#3dd68c" />
            <stop offset="1" stopColor="#f5a623" />
          </linearGradient>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#3fd9e8" opacity="0.8" />
          </marker>
        </defs>

        {/* forward arrows between nodes */}
        {[0, 1, 2].map((i) => (
          <line key={i} x1={nodes[i].x + 172} y1={92} x2={nodes[i + 1].x - 6} y2={92}
            stroke="rgba(63,217,232,.5)" strokeWidth="1.6" markerEnd="url(#arr)" />
        ))}
        {/* the return path — better nurses → better data, closing the loop */}
        <path className="loop-ring" d="M 820 132 C 850 210, 90 210, 120 132"
          fill="none" stroke="url(#loopgrad)" strokeWidth="2" markerEnd="url(#arr)" />
        <text x="470" y="222" textAnchor="middle" fontSize="12.5" fill="#8a97ad">
          …and better nurses generate better data. The system compounds every shift.
        </text>

        {nodes.map((n, i) => (
          <g className="loop-node" key={n.title}>
            <rect x={n.x} y={52} width={172} height={80} rx={16}
              fill="#0e1320" stroke="rgba(255,255,255,.13)" />
            <rect x={n.x} y={52} width={172} height={3} rx={1.5} fill={n.color} />
            <text x={n.x + 86} y={86} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#e8edf4">
              {n.title}
            </text>
            <text x={n.x + 86} y={106} textAnchor="middle" fontSize="10.5" fill="#8a97ad">
              {n.sub}
            </text>
            <text x={n.x + 14} y={44} fontSize="11" fontWeight="700" fill="#5b6680">{i + 1}</text>
          </g>
        ))}
      </svg>
      <p className="loop-caption">
        <b>This is the whole company in one picture.</b> Vitali isn't a note-taking app — it's a
        system that gets smarter every shift.
      </p>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const { start } = useTour();

  const features = [
    { to: '/shift', icon: <Users size={18} />, title: 'Circles', text: 'One shared workspace per patient — full context before anyone walks in.' },
    { to: '/circle/c2/talk', icon: <Radio size={18} />, title: 'Walkie-talkie', text: 'Push-to-talk keeps the team in sync without leaving the bedside.' },
    { to: '/circle/c2/handoff', icon: <ArrowLeftRight size={18} />, title: 'Instant handoffs', text: 'The incoming nurse is fully up to speed in seconds, not questions.' },
    { to: '/training', icon: <GraduationCap size={18} />, title: 'AI Training', text: 'Every recorded session becomes a lesson. One shift trains thousands.' },
    { to: '/impact', icon: <BarChart3 size={18} />, title: 'Insights', text: 'Anonymized process metrics prove the improvement to the hospital.' },
  ];

  return (
    <>
      <section className="hero">
        <span className="hero-eyebrow"><i />Functional demo · sample data</span>
        <h1>
          Shared patient context for nursing teams — <em>that trains every nurse from every shift</em>
        </h1>
        <p className="hero-sub">
          Vitali gives hospital nurses one live picture of every patient, real-time coordination
          during the shift — and an AI coach that turns what happened into training afterward.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary" onClick={() => navigate('/shift')}>
            See the live demo
          </button>
          <button className="btn btn-secondary" onClick={start}>
            Take the 3-minute tour
          </button>
        </div>
      </section>

      {/* The problem */}
      <section className="land-section" id="problem">
        <div className="dp-label">The problem</div>
        <h2>Nurses work in silos. Patients pay for it in repetition and waiting.</h2>
        <div className="problem-grid">
          <div className="vignette">
            <p>
              A patient comes in needing IV fluids. The first nurse takes her history. Shift
              changes — the second nurse asks the same questions. A third nurse covers a break and
              asks again. <b>Three tellings of the same story,</b> an allergy note that never got
              said out loud, supplies fetched after entering the room instead of before — and a
              five-and-a-half-hour visit that a well-coordinated team finishes in under three.
            </p>
            <p style={{ marginTop: 12 }}>
              Nothing went "wrong." Nobody was careless. The seams between people simply leaked —
              the way they do on every floor, every day.
            </p>
          </div>
          <div className="problem-points">
            <div className="card"><span className="pt-ico"><MessageSquareOff size={16} color="var(--warn)" /></span><div><b>Context doesn't travel</b><p>Each nurse starts over; patients repeat their name, history, and symptoms.</p></div></div>
            <div className="card"><span className="pt-ico"><ArrowLeftRight size={16} color="var(--warn)" /></span><div><b>Handoffs drop the details</b><p>Flagged items like allergies get lost between shifts — a safety gap, not just a delay.</p></div></div>
            <div className="card"><span className="pt-ico"><RefreshCw size={16} color="var(--warn)" /></span><div><b>The lessons evaporate</b><p>What the best nurse did brilliantly at 2am teaches no one. It isn't even recorded.</p></div></div>
          </div>
        </div>
      </section>

      {/* The loop */}
      <section className="land-section" id="loop">
        <div className="dp-label">How Vitali works</div>
        <h2>Two halves, one loop</h2>
        <p className="land-lead">
          Coordination during the shift generates data. That data becomes AI training after the
          shift. Training makes nurses better — and better nurses generate better data.
        </p>
        <LoopDiagram />
      </section>

      {/* Features linking into the demo */}
      <section className="land-section">
        <div className="dp-label">See it live</div>
        <h2>Every piece below is clickable — this demo is the product</h2>
        <div className="feat-grid">
          {features.map((f) => (
            <Link className="feat card" to={f.to} key={f.title}>
              <span className="feat-ico">{f.icon}</span>
              <b>{f.title}</b>
              <p>{f.text}</p>
              <span className="feat-go">Open in demo ▸</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Privacy & compliance — the first serious question, answered early */}
      <section className="land-section">
        <div className="card privacy-land">
          <span className="p-ico"><ShieldCheck size={22} /></span>
          <div>
            <h3>Privacy is the architecture, not a checkbox</h3>
            <p>
              <b>Patient identity and process data are kept separate by design.</b> Who a patient
              is lives only inside their care Circle; what the analytics and training engine see
              are timestamps, durations, and process events — anonymized and aggregated.
              <b> Hospitals own their data</b>, contracts keep it contained, and training material
              drops patient identity entirely. This separation is what makes the model workable
              under HIPAA — it's the first question serious reviewers ask, so it's answered first.
            </p>
          </div>
        </div>
      </section>

      <DemoFooter />
    </>
  );
}
