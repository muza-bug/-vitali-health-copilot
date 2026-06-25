/* =============================================================================
   Vitali Health AI — Hospital systems / EHR integration
   -----------------------------------------------------------------------------
   Connection point for hospital record systems (Epic, Cerner, any FHIR EHR).
   For the prototype this is backed by a small mock chart database so the
   "pull patient context from the chart" flow works end-to-end: a nurse enters a
   room or MRN when creating a Circle, and the patient context is filled in.

   >>> TODO: replace MOCK_CHARTS with a real EHR query (FHIR Patient + Encounter
       + Observation), mapping the response to EhrChart. The call site doesn't
       change. <<<
   ============================================================================= */

import type { CircleStatus, PatientFlag, Vitals } from '../types/models';

/** A de-normalized chart record, shaped to pre-fill a new Circle. */
export interface EhrChart {
  name: string;
  room: string;
  mrn: string;
  age: number;
  sex: 'F' | 'M' | 'X';
  reason: string;
  notes: string;
  allergies: string[];
  flags: PatientFlag[];
  vitals: Vitals;
  suggestedStatus: CircleStatus;
}

const now = () => new Date().toISOString();

/** Mock "hospital EHR" — keyed loosely; matched by room or MRN below. */
const MOCK_CHARTS: EhrChart[] = [
  {
    name: 'Arthur Bennett',
    room: '409',
    mrn: '•••6035',
    age: 72,
    sex: 'M',
    reason: 'COPD exacerbation — increased work of breathing',
    notes:
      'Admitted from ED. On 4L O2, sats 90–92%. Nebulizers q4h, prednisone started. Watch respiratory effort closely.',
    allergies: ['Penicillin'],
    flags: [
      { kind: 'allergy', label: 'Penicillin' },
      { kind: 'fall-risk', label: 'Fall risk' },
    ],
    vitals: { hr: 96, bp: '142/88', spo2: 91, temp: 37.4, resp: 24, pain: 2, takenAt: now() },
    suggestedStatus: 'monitoring',
  },
  {
    name: 'Diane Foster',
    room: '415',
    mrn: '•••2271',
    age: 64,
    sex: 'F',
    reason: 'Post-op — laparoscopic cholecystectomy',
    notes:
      'POD 0. Tolerating sips, pain well controlled. Monitor for nausea/vomiting. Encourage early mobilization.',
    allergies: ['Morphine', 'Latex'],
    flags: [
      { kind: 'allergy', label: 'Morphine' },
      { kind: 'allergy', label: 'Latex' },
    ],
    vitals: { hr: 82, bp: '128/76', spo2: 98, temp: 36.8, resp: 16, pain: 3, takenAt: now() },
    suggestedStatus: 'stable',
  },
  {
    name: 'Marcus Webb',
    room: '421',
    mrn: '•••5588',
    age: 58,
    sex: 'M',
    reason: 'New atrial fibrillation with RVR — rate control',
    notes:
      'On continuous telemetry and a diltiazem drip. HR trending down. Cardiology consulted. Anticoagulation pending.',
    allergies: [],
    flags: [{ kind: 'critical', label: 'Telemetry' }],
    vitals: { hr: 118, bp: '134/82', spo2: 97, temp: 36.9, resp: 18, pain: 0, takenAt: now() },
    suggestedStatus: 'monitoring',
  },
  {
    name: 'Helen Park',
    room: '402',
    mrn: '•••9140',
    age: 79,
    sex: 'F',
    reason: 'Mechanical fall — head laceration, on anticoagulation',
    notes:
      'On warfarin. CT head negative. Neuro checks q2h. Laceration sutured. High fall precautions in place.',
    allergies: ['Sulfa drugs'],
    flags: [
      { kind: 'fall-risk', label: 'High fall risk' },
      { kind: 'allergy', label: 'Sulfa drugs' },
    ],
    vitals: { hr: 74, bp: '138/80', spo2: 96, temp: 36.6, resp: 15, pain: 4, takenAt: now() },
    suggestedStatus: 'monitoring',
  },
];

/** Rooms available to pull in the demo (shown as hints in the UI). */
export const EHR_DEMO_ROOMS = MOCK_CHARTS.map((c) => c.room);

/**
 * Pull a patient record from the EHR by room number or MRN.
 * TODO: replace with a real FHIR query; keep the EhrChart return shape.
 */
export async function fetchPatientRecord(query: string): Promise<EhrChart | null> {
  await new Promise((r) => setTimeout(r, 650)); // feel of a chart lookup
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    MOCK_CHARTS.find(
      (c) => c.room.toLowerCase() === q || c.mrn.toLowerCase().includes(q),
    ) ?? null
  );
}

/**
 * Write a finalized note back to the patient's chart.
 * TODO: POST a DocumentReference / Observation to the EHR.
 */
export async function pushNoteToEhr(_circleId: string, _note: string): Promise<void> {
  // No-op placeholder.
}
