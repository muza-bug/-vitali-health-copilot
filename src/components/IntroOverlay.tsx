/* Brand intro shown each time the app opens. A short, swipeable tour of what
   Vitali does, then it gets out of the way. Mounted at the app root (App.tsx)
   so it greets the nurse before anything else. */

import { Activity, ArrowRight, Radio, Sparkles, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Logo } from './Logo';

interface Slide {
  icon: ReactNode;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: <Users size={26} />,
    title: 'One picture, instantly shared',
    body: 'Open a patient Circle and see the full context before you walk in — reason, flags, vitals, and the team — no rebuilding from scratch.',
  },
  {
    icon: <Activity size={26} />,
    title: 'Live data, as it happens',
    body: 'Bedside vitals stream in real time and notable changes land on the timeline, so the whole team stays in sync.',
  },
  {
    icon: <Sparkles size={26} />,
    title: 'An AI care assistant',
    body: 'A built-in assistant reads each Circle and suggests prioritized next steps and handoff briefings — grounded only in that patient’s data.',
  },
  {
    icon: <Radio size={26} />,
    title: 'Coordinate, hands-free',
    body: 'Push-to-talk like a walkie-talkie. Everything is timestamped, and process metrics stay anonymized.',
  },
];

export function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  return (
    <div className="intro" role="dialog" aria-modal="true" aria-label="Welcome to Vitali">
      <div className="intro-aurora" aria-hidden="true" />
      <button className="intro-skip" onClick={onDone}>Skip</button>

      <div className="intro-inner">
        <div className="intro-brand">
          <Logo size={58} variant="card" />
          <span className="intro-word">Vitali<span className="t-dim"> Health AI</span></span>
        </div>

        <div className="intro-card" key={i}>
          <span className="intro-icon">{slide.icon}</span>
          <h2 className="intro-title">{slide.title}</h2>
          <p className="intro-body t-dim">{slide.body}</p>
        </div>

        <div className="intro-dots" role="tablist" aria-label="Slides">
          {SLIDES.map((_, n) => (
            <button
              key={n}
              className={`intro-dot ${n === i ? 'is-active' : ''}`}
              aria-label={`Go to slide ${n + 1}`}
              aria-selected={n === i}
              role="tab"
              onClick={() => setI(n)}
            />
          ))}
        </div>

        <button className="btn btn-primary btn-block intro-cta" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? 'Get started' : 'Next'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
