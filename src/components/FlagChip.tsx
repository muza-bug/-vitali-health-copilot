/* A patient flag (allergy, fall-risk, DNR, isolation, NPO, critical) as a toned
   chip with its icon. Tone + icon come from lib/meta so flags read identically
   everywhere they appear. */

import { flagMeta, toneChip } from '../lib/meta';
import type { PatientFlag } from '../types/models';

export function FlagChip({ flag }: { flag: PatientFlag }) {
  const { tone, Icon } = flagMeta[flag.kind];
  return (
    <span className={`chip ${toneChip[tone]}`}>
      <Icon size={12} strokeWidth={2.4} />
      {flag.label}
    </span>
  );
}
