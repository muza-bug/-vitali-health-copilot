/* A Circle's status as a colored chip with a status dot. */

import { statusMeta, toneChip, toneDot } from '../lib/meta';
import type { CircleStatus } from '../types/models';

export function StatusBadge({ status }: { status: CircleStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={`chip ${toneChip[meta.tone]}`}>
      <span className={`dot ${toneDot[meta.tone]}`} />
      {meta.label}
    </span>
  );
}
