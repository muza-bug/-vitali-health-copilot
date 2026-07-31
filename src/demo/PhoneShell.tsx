/* =============================================================================
   Phone shell — presents the real app prototype inside device chrome, clearly
   labeled as a live demo (so nobody mistakes it for a deployed clinical system).
   The brand intro plays once on first app visit — unless the guided tour is
   driving, which replaces it.
   ============================================================================= */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { IntroOverlay } from '../components/IntroOverlay';
import { useTour } from './Tour';

// Module-level so the intro shows once per page load, not per navigation.
let introSeenThisLoad = false;

export function PhoneShell() {
  const { started } = useTour();
  const [showIntro, setShowIntro] = useState(() => !introSeenThisLoad && !started);
  const dismissIntro = () => {
    introSeenThisLoad = true;
    setShowIntro(false);
  };

  return (
    <div className="phone-stage">
      <div className="phone-chrome" aria-hidden="true">
        <span>
          <b>● Live demo</b> · the nurse-facing app · sample data
        </span>
      </div>
      <div className="app-frame">
        {showIntro && !started && <IntroOverlay onDone={dismissIntro} />}
        <Outlet />
      </div>
    </div>
  );
}
