/* =============================================================================
   Demo shell — the one persistent navigation across every surface:
   Home · Live Demo · Training · Insights · About, plus "Take the tour".
   Wraps the landing page, the phone-framed live app, and the full-width pages.
   ============================================================================= */

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { TourOverlay, useTour } from './Tour';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/shift', label: 'Live Demo', match: 'app' },
  { to: '/training', label: 'Training' },
  { to: '/impact', label: 'Insights' },
  { to: '/about', label: 'About' },
];

/** Paths that belong to the phone app surface (for nav highlighting). */
const APP_PREFIXES = ['/shift', '/insights', '/learn', '/profile', '/create', '/team', '/circle', '/login'];

export function DemoShell() {
  const { start } = useTour();
  const navigate = useNavigate();
  return (
    <div className="demo-root">
      <header className="demo-top">
        <div className="demo-top-in">
          <a
            className="demo-logo"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            <span className="demo-logo-mark" aria-hidden="true" />
            Vitali <span className="t-faint" style={{ fontWeight: 600, fontSize: 12 }}>Health AI</span>
          </a>
          <nav className="demo-nav" aria-label="Demo sections">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => {
                  const appActive =
                    n.match === 'app' &&
                    APP_PREFIXES.some((p) => window.location.pathname.startsWith(p));
                  return `${isActive || appActive ? 'is-on' : ''}`;
                }}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="demo-top-right">
            <span className="demo-sample-chip" title="Everything here is sample data — no real patients">
              Demo · sample data
            </span>
            <button className="tour-btn" onClick={start}>Take the tour</button>
          </div>
        </div>
      </header>
      <Outlet />
      <TourOverlay />
    </div>
  );
}

/** Shared footer for the full-width surfaces. */
export function DemoFooter() {
  return (
    <footer className="demo-footer">
      <div className="demo-footer-in">
        <p>
          <b>Vitali Health AI</b> — shared patient context and real-time coordination for hospital
          nursing teams, with an AI training engine that turns every shift into lessons.
          Contact: hello@vitali.health
        </p>
        <p className="fine">
          This is a functional product demo built entirely on sample data. Every patient, nurse,
          room, and number is fictional. No real clinical data is collected or displayed.
        </p>
      </div>
    </footer>
  );
}
