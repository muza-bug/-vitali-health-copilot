/* =============================================================================
   One shift trains thousands — the multiplier visual. The exemplar session
   (Room 118) at the center, radiating out to the nurses who learned from it.
   ============================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { scaleStory } from '../data/demoContent';
import { DemoFooter } from './DemoShell';

export function ScalePage() {
  const reduced = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Deterministic constellation layout (stable between renders).
  const { edges, nodes } = useMemo(() => {
    const cx = 430, cy = 210;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const edges: { x: number; y: number }[] = [];
    const nodes: { x: number; y: number; lit: boolean; delay: number }[] = [];
    for (let i = 0; i < 120; i++) {
      const ang = rnd() * Math.PI * 2;
      const dist = 105 + rnd() * 165;
      const x = cx + Math.cos(ang) * dist * 1.55;
      const y = cy + Math.sin(ang) * dist * 0.82;
      if (x < 14 || x > 846 || y < 14 || y > 406) continue;
      const lit = rnd() > 0.45;
      if (lit) edges.push({ x, y });
      nodes.push({ x, y, lit, delay: rnd() * 2.4 });
    }
    return { edges, nodes };
  }, []);

  // Animated counter (instant under reduced motion).
  const [count, setCount] = useState(reduced ? scaleStory.nursesTrained : 0);
  const ran = useRef(false);
  useEffect(() => {
    if (reduced || ran.current) return;
    ran.current = true;
    const t0 = performance.now();
    const dur = 1600;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setCount(Math.round(scaleStory.nursesTrained * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [reduced]);

  return (
    <>
      <div className="dp">
        <div className="scale-hero">
          <span className="chip chip-cyan">The multiplier</span>
          <h1>One real shift becomes a lesson that trains thousands</h1>
          <p>
            When a team handles a case exceptionally well, Vita extracts the transferable lesson
            and routes it to every nurse who faces similar cases — so one nurse's best night
            becomes everyone's baseline.
          </p>
        </div>

        <div className="constellation">
          <svg
            viewBox="0 0 860 420"
            role="img"
            aria-label="A network visual: one exemplary session at the center connected to hundreds of nurse nodes radiating outward"
          >
            {edges.map((e, i) => (
              <line key={i} className="const-edge" x1={430} y1={210} x2={e.x} y2={e.y} />
            ))}
            {nodes.map((n, i) => (
              <circle
                key={i}
                className={`const-node ${n.lit ? 'lit' : ''} ${n.lit && !reduced ? 'const-pulse' : ''}`}
                cx={n.x}
                cy={n.y}
                r={n.lit ? 3.2 : 2.2}
                style={{ animationDelay: `${n.delay.toFixed(2)}s` }}
              />
            ))}
            <circle cx={430} cy={210} r={66} fill="rgba(63,217,232,.05)" stroke="rgba(63,217,232,.3)" />
          </svg>
          <div className="const-center">
            <div className="num">{count.toLocaleString()}</div>
            <div className="lbl">
              nurses trained from
              <br />
              <b style={{ color: 'var(--text)' }}>Room 118 · one 2h 25m shift</b>
            </div>
          </div>
        </div>

        <div className="scale-stats">
          <div className="card dstat"><div className="num" style={{ color: 'var(--ok)' }}>{scaleStory.ivFaster}</div><div className="lbl">faster IV placement on trainees' next shift</div></div>
          <div className="card dstat"><div className="num" style={{ color: 'var(--ok)' }}>{scaleStory.repeatsDown}</div><div className="lbl">repeated questions to patients after this lesson</div></div>
          <div className="card dstat"><div className="num">{scaleStory.hospitals} hospitals</div><div className="lbl">where this lesson is in rotation</div></div>
        </div>

        <div className="card lesson-quote">
          <div className="dp-label">The generalized lesson Vita extracted</div>
          <p className="q">{scaleStory.lesson}</p>
          <p className="a">{scaleStory.lessonBy}</p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link className="btn btn-secondary" to="/training/session/c118">Watch the source session ▸</Link>
        </div>
      </div>
      <DemoFooter />
    </>
  );
}
