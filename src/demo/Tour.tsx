/* =============================================================================
   Guided tour — walks a first-time viewer through the whole story in 7 steps,
   navigating between surfaces with a caption card. Exit anytime; all state is
   in memory (no storage, by design).
   ============================================================================= */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { tourSteps } from '../data/demoContent';

interface TourState {
  active: boolean;
  step: number;
  /** True once a tour has ever started this page-load (suppresses the app intro). */
  started: boolean;
  start: () => void;
  next: () => void;
  prev: () => void;
  exit: () => void;
}

const TourContext = createContext<TourState | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);

  const go = useCallback(
    (i: number) => {
      setStep(i);
      navigate(tourSteps[i].path);
    },
    [navigate],
  );

  const start = useCallback(() => {
    setStarted(true);
    setActive(true);
    go(0);
  }, [go]);
  const next = useCallback(() => {
    setStep((s) => {
      if (s >= tourSteps.length - 1) {
        setActive(false);
        return s;
      }
      const n = s + 1;
      navigate(tourSteps[n].path);
      return n;
    });
  }, [navigate]);
  const prev = useCallback(() => {
    setStep((s) => {
      const n = Math.max(0, s - 1);
      navigate(tourSteps[n].path);
      return n;
    });
  }, [navigate]);
  const exit = useCallback(() => setActive(false), []);

  const value = useMemo(
    () => ({ active, step, started, start, next, prev, exit }),
    [active, step, started, start, next, prev, exit],
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within <TourProvider>');
  return ctx;
}

/** The floating caption card shown while the tour is active. */
export function TourOverlay() {
  const { active, step, next, prev, exit } = useTour();
  if (!active) return null;
  const s = tourSteps[step];
  const last = step === tourSteps.length - 1;
  return (
    <div className="tour-card card" role="dialog" aria-label="Guided tour">
      <h3>{s.title}</h3>
      <p>{s.text}</p>
      <div className="tour-foot">
        <span className="tour-dots" aria-label={`Step ${step + 1} of ${tourSteps.length}`}>
          {tourSteps.map((_, i) => (
            <i key={i} className={i <= step ? 'done' : ''} />
          ))}
        </span>
        <button className="link-btn" onClick={exit}>Exit tour</button>
        {step > 0 && (
          <button className="btn btn-secondary" onClick={prev}>Back</button>
        )}
        <button className="btn btn-primary" onClick={last ? exit : next}>
          {last ? 'Explore freely' : 'Next'}
        </button>
      </div>
    </div>
  );
}
