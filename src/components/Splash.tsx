/* Branded loading state shown while the app hydrates. */

import { Logo } from './Logo';

export function Splash({ label = 'Loading your shift…' }: { label?: string }) {
  return (
    <div className="splash">
      <div className="splash-inner animate-fade">
        <Logo size={68} variant="card" />
        <span className="splash-word">
          Vitali<span className="t-dim"> Health AI</span>
        </span>
        <span className="splash-label t-faint">{label}</span>
      </div>
    </div>
  );
}
