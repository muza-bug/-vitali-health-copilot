/* Reusable inline reassurance that data stays contained / anonymized.
   "Privacy made visible" is a core product principle — surfaced, not hidden. */

import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <div className="privacy-note">
      <ShieldCheck size={15} strokeWidth={2.2} />
      <span>{children}</span>
    </div>
  );
}
