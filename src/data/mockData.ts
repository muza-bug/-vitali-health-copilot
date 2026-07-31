/* =============================================================================
   Vitali Health AI — Mock seed data
   Stands in for what a real backend would return. The API service (services/api.ts)
   loads a mutable copy of this so the prototype is fully interactive in a demo
   (you can add updates, complete tasks, send voice clips) without a server.

   NOTHING here is real patient data — every name, room, and number is invented.
   ============================================================================= */

import type {
  AggregateInsight,
  Circle,
  Nurse,
  ProcessMetric,
  Shift,
  Task,
  TimelineEntry,
  VoiceMessage,
} from '../types/models';

/** Fixed "now" for the session so relative times read consistently. */
const NOW = Date.now();
const min = (n: number) => new Date(NOW - n * 60_000).toISOString();
const hr = (n: number) => new Date(NOW - n * 3_600_000).toISOString();

/* ------------------------------------------------------------------- Nurses */

/** The signed-in nurse for this prototype session. */
export const CURRENT_NURSE_ID = 'n1';

export const nurses: Nurse[] = [
  {
    id: 'n1',
    name: 'Maria Santos',
    initials: 'MS',
    role: 'Registered Nurse',
    unit: '4 West — Cardiac',
    avatarHue: 188,
    online: true,
    code: '4821',
    statusNote: 'On the floor — day shift',
  },
  {
    id: 'n7',
    name: 'James Okafor',
    initials: 'JO',
    role: 'Registered Nurse',
    unit: '4 West — Cardiac',
    avatarHue: 266,
    online: true,
    code: '6114',
    statusNote: 'Precepting today — happy to help',
  },
  {
    id: 'n2',
    name: 'Daniel Osei',
    initials: 'DO',
    role: 'Charge Nurse',
    unit: '4 West — Cardiac',
    avatarHue: 266,
    online: true,
    code: '3307',
    statusNote: 'Charge nurse — page me for escalations',
  },
  {
    id: 'n3',
    name: 'Priya Raman',
    initials: 'PR',
    role: 'Registered Nurse',
    unit: '4 West — Cardiac',
    avatarHue: 150,
    online: true,
    code: '5192',
    statusNote: 'Covering rooms 410–418',
  },
  {
    id: 'n4',
    name: 'Liam Walsh',
    initials: 'LW',
    role: 'Licensed Practical Nurse',
    unit: '4 West — Cardiac',
    avatarHue: 32,
    online: false,
    code: '2640',
    statusNote: 'Off shift',
  },
  {
    id: 'n5',
    name: 'Sofia Marino',
    initials: 'SM',
    role: 'Nurse Practitioner',
    unit: '4 West — Cardiac',
    avatarHue: 212,
    online: true,
    code: '7158',
    statusNote: 'Following sepsis & post-op patients',
  },
  {
    id: 'n6',
    name: 'Grace Kim',
    initials: 'GK',
    role: 'Care Assistant',
    unit: '4 West — Cardiac',
    avatarHue: 322,
    online: false,
    code: '8904',
    statusNote: 'Off shift',
  },
];

export const currentShift: Shift = {
  id: 's1',
  nurseId: CURRENT_NURSE_ID,
  unit: '4 West — Cardiac',
  startsAt: hr(2.5),
  endsAt: hr(-9.5), // ends in ~9.5h
  label: 'Day shift',
};

/* ------------------------------------------------------------------ Circles */

export const circles: Circle[] = [
  {
    id: 'c2',
    reason: 'Sepsis watch — rising lactate, febrile',
    notes:
      'Started on broad-spectrum abx at 11:40. Lactate trending up (2.1 → 3.4). Watch BP closely — borderline hypotensive. Family at bedside, kept informed.',
    status: 'critical',
    createdBy: 'n5',
    createdAt: hr(3),
    lastUpdateAt: min(2),
    memberIds: ['n1', 'n5', 'n2'],
    hasLiveActivity: true,
    patient: {
      id: 'p3',
      name: 'Eleanor Whitfield',
      room: '405',
      mrn: '•••7290',
      age: 81,
      sex: 'F',
      admittedAt: hr(20),
      flags: [
        { kind: 'critical', label: 'Sepsis watch' },
        { kind: 'isolation', label: 'Contact isolation' },
        { kind: 'fall-risk', label: 'High fall risk' },
      ],
      vitals: {
        hr: 112,
        bp: '98/58',
        spo2: 94,
        temp: 38.6,
        resp: 22,
        pain: 3,
        takenAt: min(6),
        trends: { hr: 'up', bp: 'down', spo2: 'down', temp: 'up' },
      },
    },
  },
  {
    id: 'c1',
    reason: 'Post-op recovery — total hip replacement',
    notes:
      'POD 1. Pain well controlled on oral meds. Encourage early mobilization per PT. Watch surgical drain output. Daughter is primary contact.',
    status: 'monitoring',
    createdBy: 'n2',
    createdAt: hr(6),
    lastUpdateAt: min(9),
    memberIds: ['n1', 'n2', 'n3'],
    patient: {
      id: 'p1',
      name: 'Maria Alvarez',
      room: '412',
      mrn: '•••4821',
      age: 67,
      sex: 'F',
      admittedAt: hr(28),
      flags: [
        { kind: 'allergy', label: 'Penicillin' },
        { kind: 'fall-risk', label: 'Fall risk' },
      ],
      vitals: {
        hr: 78,
        bp: '124/79',
        spo2: 97,
        temp: 36.9,
        resp: 16,
        pain: 2,
        takenAt: min(22),
        trends: { hr: 'steady', bp: 'steady', spo2: 'up', temp: 'down' },
      },
    },
  },
  {
    id: 'c3',
    reason: 'Chest pain — rule out ACS',
    notes:
      'Admitted from ED for serial troponins + telemetry. First troponin negative, second pending. Comfortable, no active pain at rest.',
    status: 'stable',
    createdBy: 'n1',
    createdAt: hr(1),
    lastUpdateAt: min(26),
    memberIds: ['n1', 'n3'],
    patient: {
      id: 'p2',
      name: 'Samuel Adeyemi',
      room: '418',
      mrn: '•••3155',
      age: 54,
      sex: 'M',
      admittedAt: hr(4),
      flags: [{ kind: 'dnr', label: 'DNR on file' }],
      vitals: {
        hr: 71,
        bp: '131/84',
        spo2: 98,
        temp: 36.7,
        resp: 15,
        pain: 1,
        takenAt: min(30),
        trends: { hr: 'steady', bp: 'steady', spo2: 'steady', temp: 'steady' },
      },
    },
  },
  /* --- The two completed episodes that power the Training story. -------------
     Room 214 is the "room to improve" case; Room 118 is the exemplar. The SAME
     Circles appear in the live app, the Learn tab, the full Training review
     (src/data/demoContent.ts), and the Insights rollups — one continuous loop. */
  {
    id: 'c214',
    reason: 'Caffeine toxicity — IV fluids',
    notes:
      'Energy-drink overuse; tachycardic and anxious on arrival. Plan: IV fluids, telemetry, reassess q30. Resolved and discharged on day shift.',
    status: 'discharge',
    createdBy: 'n1',
    createdAt: hr(30),
    lastUpdateAt: hr(24),
    memberIds: ['n1', 'n2', 'n3', 'n6'],
    patient: {
      id: 'p214',
      name: 'Dana Kowalski',
      room: '214',
      mrn: '•••8804',
      age: 29,
      sex: 'F',
      admittedAt: hr(31),
      flags: [{ kind: 'allergy', label: 'Latex' }],
      vitals: {
        hr: 84, bp: '118/74', spo2: 98, temp: 36.8, resp: 15, pain: 1,
        takenAt: hr(24),
        trends: { hr: 'down', bp: 'steady', spo2: 'steady', temp: 'steady' },
      },
    },
  },
  {
    id: 'c118',
    reason: 'Dehydration — IV fluids',
    notes:
      'GI bug, orthostatic on arrival. IV placed in 11 minutes; discharged in 2h 25m with zero repeated questions — the model run for this case type.',
    status: 'discharge',
    createdBy: 'n7',
    createdAt: hr(52),
    lastUpdateAt: hr(49),
    memberIds: ['n7', 'n5', 'n4'],
    patient: {
      id: 'p118',
      name: 'Rosa Nguyen',
      room: '118',
      mrn: '•••2417',
      age: 41,
      sex: 'F',
      admittedAt: hr(53),
      flags: [{ kind: 'allergy', label: 'Sulfa drugs' }],
      vitals: {
        hr: 76, bp: '122/78', spo2: 99, temp: 36.7, resp: 14, pain: 0,
        takenAt: hr(49),
        trends: { hr: 'down', bp: 'up', spo2: 'steady', temp: 'steady' },
      },
    },
  },
];

/* ----------------------------------------------------------- Timeline entries */

export const timeline: TimelineEntry[] = [
  // --- c214 (Dana, completed — the "room to improve" training case) ---
  { id: 't214a', circleId: 'c214', authorId: 'n1', kind: 'join', text: 'opened this Circle', createdAt: hr(30) },
  { id: 't214b', circleId: 'c214', authorId: 'n1', kind: 'note', text: 'Latex allergy flagged. Chief complaint + history logged before first contact.', createdAt: hr(29.9) },
  { id: 't214c', circleId: 'c214', authorId: 'n2', kind: 'note', text: 'Handoff taken. Re-asked history at bedside — note to self: it was already in the Circle.', createdAt: hr(28.5) },
  { id: 't214d', circleId: 'c214', authorId: 'n3', kind: 'note', text: 'IV supplies staged late — line placed after second trip to the cart.', createdAt: hr(27.8) },
  { id: 't214e', circleId: 'c214', authorId: 'n3', kind: 'voice', text: 'sent a voice message', createdAt: hr(27.7), voiceMessageId: 'v214' },
  { id: 't214f', circleId: 'c214', authorId: 'n1', kind: 'status', text: 'changed status to discharge', createdAt: hr(24) },
  // --- c118 (Rosa, completed — the exemplar training case) ---
  { id: 't118a', circleId: 'c118', authorId: 'n7', kind: 'join', text: 'opened this Circle', createdAt: hr(52) },
  { id: 't118b', circleId: 'c118', authorId: 'n7', kind: 'note', text: 'Full context in before first contact. Allergies confirmed out loud at handoff.', createdAt: hr(51.8) },
  { id: 't118c', circleId: 'c118', authorId: 'n5', kind: 'note', text: 'Supplies staged while reviewing the Circle — line in 11 minutes from arrival.', createdAt: hr(51.5) },
  { id: 't118d', circleId: 'c118', authorId: 'n7', kind: 'note', text: 'Closing note: fluids complete, steady on feet, discharge teaching done.', createdAt: hr(49.2) },
  { id: 't118e', circleId: 'c118', authorId: 'n7', kind: 'status', text: 'changed status to discharge', createdAt: hr(49) },
  // --- c2 (Eleanor, critical) ---
  {
    id: 't20',
    circleId: 'c2',
    authorId: 'n5',
    kind: 'join',
    text: 'opened this Circle',
    createdAt: hr(3),
  },
  {
    id: 't21',
    circleId: 'c2',
    authorId: 'n5',
    kind: 'note',
    text: 'Lactate 2.1 on admission. Cultures drawn, broad-spectrum antibiotics started. Monitoring closely for septic shock.',
    createdAt: hr(2.8),
  },
  {
    id: 't22',
    circleId: 'c2',
    authorId: 'n2',
    kind: 'join',
    text: 'joined the Circle',
    createdAt: hr(2.5),
  },
  {
    id: 't23',
    circleId: 'c2',
    authorId: 'n1',
    kind: 'join',
    text: 'joined the Circle',
    createdAt: hr(1.2),
  },
  {
    id: 't24',
    circleId: 'c2',
    authorId: 'n1',
    kind: 'task-done',
    text: 'Repeat lactate draw',
    createdAt: min(48),
    durationMs: 9 * 60_000,
  },
  {
    id: 't25',
    circleId: 'c2',
    authorId: 'n5',
    kind: 'note',
    text: 'Lactate now 3.4 — escalating. Paged on-call. Increased monitoring to q15min vitals.',
    createdAt: min(40),
  },
  {
    id: 't26',
    circleId: 'c2',
    authorId: 'n1',
    kind: 'voice',
    text: 'sent a voice message',
    createdAt: min(8),
    voiceMessageId: 'v20',
  },
  {
    id: 't27',
    circleId: 'c2',
    authorId: 'n2',
    kind: 'note',
    text: 'At bedside now. BP holding at 98/58. Family updated. Will stay until on-call arrives.',
    createdAt: min(2),
  },

  // --- c1 (Maria, monitoring) ---
  {
    id: 't10',
    circleId: 'c1',
    authorId: 'n2',
    kind: 'join',
    text: 'opened this Circle',
    createdAt: hr(6),
  },
  {
    id: 't11',
    circleId: 'c1',
    authorId: 'n2',
    kind: 'note',
    text: 'Back from PACU, stable. Pain 4/10, given scheduled oral analgesia. Surgical site clean and dry.',
    createdAt: hr(5.8),
  },
  {
    id: 't12',
    circleId: 'c1',
    authorId: 'n3',
    kind: 'join',
    text: 'joined the Circle',
    createdAt: hr(5),
  },
  {
    id: 't13',
    circleId: 'c1',
    authorId: 'n1',
    kind: 'join',
    text: 'joined the Circle',
    createdAt: hr(2.4),
  },
  {
    id: 't14',
    circleId: 'c1',
    authorId: 'n3',
    kind: 'task-done',
    text: 'Assist first ambulation with PT',
    createdAt: hr(2),
    durationMs: 18 * 60_000,
  },
  {
    id: 't15',
    circleId: 'c1',
    authorId: 'n1',
    kind: 'note',
    text: 'Tolerated short walk to door and back. Pain now 2/10. Encouraged to use incentive spirometer hourly.',
    createdAt: min(34),
  },
  {
    id: 't16',
    circleId: 'c1',
    authorId: 'n1',
    kind: 'voice',
    text: 'sent a voice message',
    createdAt: min(9),
    voiceMessageId: 'v10',
  },

  // --- c3 (James, stable) ---
  {
    id: 't30',
    circleId: 'c3',
    authorId: 'n1',
    kind: 'join',
    text: 'opened this Circle',
    createdAt: hr(1),
  },
  {
    id: 't31',
    circleId: 'c3',
    authorId: 'n1',
    kind: 'note',
    text: 'Settled in from ED. On telemetry. First troponin negative. Comfortable, denies pain at rest.',
    createdAt: min(58),
  },
  {
    id: 't32',
    circleId: 'c3',
    authorId: 'n3',
    kind: 'join',
    text: 'joined the Circle',
    createdAt: min(40),
  },
  {
    id: 't33',
    circleId: 'c3',
    authorId: 'n3',
    kind: 'task-done',
    text: 'Place on continuous telemetry',
    createdAt: min(38),
    durationMs: 6 * 60_000,
  },
  {
    id: 't34',
    circleId: 'c3',
    authorId: 'n1',
    kind: 'note',
    text: 'Second troponin drawn, sent to lab. Patient resting. Will reassess on results.',
    createdAt: min(26),
  },
];

/* --------------------------------------------------------------------- Tasks */

export const tasks: Task[] = [
  // --- c214 (completed case; one task left open at discharge — a teaching point) ---
  { id: 'tk214a', circleId: 'c214', label: 'Place IV, start fluids', category: 'medication', createdBy: 'n1', status: 'done', createdAt: hr(29.5), completedAt: hr(28.98), durationMs: 31 * 60_000 },
  { id: 'tk214b', circleId: 'c214', label: 'Repeat vitals after first bag', category: 'assessment', createdBy: 'n2', status: 'done', createdAt: hr(27), completedAt: hr(26.7), durationMs: 18 * 60_000 },
  { id: 'tk214c', circleId: 'c214', label: 'Discharge teaching — caffeine limits', category: 'documentation', createdBy: 'n1', status: 'open', createdAt: hr(25) },
  // --- c118 (exemplar; everything closed) ---
  { id: 'tk118a', circleId: 'c118', label: 'Place IV, start fluids', category: 'medication', createdBy: 'n7', status: 'done', createdAt: hr(51.9), completedAt: hr(51.72), durationMs: 11 * 60_000 },
  { id: 'tk118b', circleId: 'c118', label: 'Orthostatics before discharge', category: 'assessment', createdBy: 'n5', status: 'done', createdAt: hr(50), completedAt: hr(49.8), durationMs: 12 * 60_000 },
  { id: 'tk118c', circleId: 'c118', label: 'Discharge teaching — hydration plan', category: 'documentation', createdBy: 'n7', status: 'done', createdAt: hr(49.6), completedAt: hr(49.3), durationMs: 16 * 60_000 },
  // c2
  {
    id: 'tk20',
    circleId: 'c2',
    label: 'Repeat lactate draw',
    category: 'assessment',
    createdBy: 'n5',
    assigneeId: 'n1',
    status: 'done',
    createdAt: min(57),
    completedAt: min(48),
    durationMs: 9 * 60_000,
  },
  {
    id: 'tk21',
    circleId: 'c2',
    label: 'q15min vitals until on-call review',
    category: 'assessment',
    createdBy: 'n5',
    assigneeId: 'n1',
    status: 'open',
    createdAt: min(40),
  },
  {
    id: 'tk22',
    circleId: 'c2',
    label: 'Hang second fluid bolus',
    category: 'medication',
    createdBy: 'n5',
    status: 'open',
    createdAt: min(20),
  },

  // c1
  {
    id: 'tk10',
    circleId: 'c1',
    label: 'Assist first ambulation with PT',
    category: 'mobility',
    createdBy: 'n2',
    assigneeId: 'n3',
    status: 'done',
    createdAt: hr(2.3),
    completedAt: hr(2),
    durationMs: 18 * 60_000,
  },
  {
    id: 'tk11',
    circleId: 'c1',
    label: 'Empty + record surgical drain output',
    category: 'assessment',
    createdBy: 'n1',
    status: 'open',
    createdAt: min(34),
  },
  {
    id: 'tk12',
    circleId: 'c1',
    label: 'Next scheduled analgesia at 16:00',
    category: 'medication',
    createdBy: 'n1',
    assigneeId: 'n1',
    status: 'open',
    createdAt: min(30),
  },

  // c3
  {
    id: 'tk30',
    circleId: 'c3',
    label: 'Place on continuous telemetry',
    category: 'assessment',
    createdBy: 'n1',
    assigneeId: 'n3',
    status: 'done',
    createdAt: min(44),
    completedAt: min(38),
    durationMs: 6 * 60_000,
  },
  {
    id: 'tk31',
    circleId: 'c3',
    label: 'Chase second troponin result',
    category: 'coordination',
    createdBy: 'n1',
    assigneeId: 'n1',
    status: 'open',
    createdAt: min(26),
  },
];

/* ------------------------------------------------------------- Voice messages */

export const voiceMessages: VoiceMessage[] = [
  {
    id: 'v214',
    circleId: 'c214',
    senderId: 'n3',
    durationSec: 6,
    createdAt: hr(27.7),
    audioUrl: null,
    transcript: 'Line is in, fluids running — first bag up. She’s calmer already.',
    status: 'played',
  },
  {
    id: 'v20',
    circleId: 'c2',
    senderId: 'n1',
    durationSec: 7,
    createdAt: min(8),
    audioUrl: null,
    transcript:
      'BP just dipped to 96 over 56, I’ve got eyes on her — can someone bring the second bolus?',
    status: 'played',
  },
  {
    id: 'v10',
    circleId: 'c1',
    senderId: 'n1',
    durationSec: 5,
    createdAt: min(9),
    audioUrl: null,
    transcript: 'Maria did great on her walk — pain’s down to a 2, she’s in good spirits.',
    status: 'played',
  },
];

/* --------------------------------------------- De-identified process metrics */
/* These carry NO patient or nurse identity — only unit + type + duration.     */

export const processMetrics: ProcessMetric[] = [
  { id: 'm1', type: 'task_completion', category: 'medication', unit: '4 West', durationMs: 7 * 60_000, capturedAt: hr(5) },
  { id: 'm2', type: 'task_completion', category: 'mobility', unit: '4 West', durationMs: 18 * 60_000, capturedAt: hr(4) },
  { id: 'm3', type: 'task_completion', category: 'assessment', unit: '4 West', durationMs: 9 * 60_000, capturedAt: hr(3) },
  { id: 'm4', type: 'task_completion', category: 'assessment', unit: '4 West', durationMs: 6 * 60_000, capturedAt: hr(2) },
  { id: 'm5', type: 'handoff_time', category: 'general', unit: '4 West', durationMs: 372_000, capturedAt: hr(6) },
  { id: 'm6', type: 'handoff_time', category: 'general', unit: '4 West', durationMs: 286_000, capturedAt: hr(2) },
  { id: 'm7', type: 'response_time', category: 'general', unit: '4 West', durationMs: 92_000, capturedAt: hr(1) },
  { id: 'm8', type: 'response_time', category: 'general', unit: '4 West', durationMs: 54_000, capturedAt: min(40) },
  { id: 'm9', type: 'circle_setup', category: 'general', unit: '4 West', durationMs: 51_000, capturedAt: hr(6) },
  { id: 'm10', type: 'circle_setup', category: 'general', unit: '4 West', durationMs: 43_000, capturedAt: hr(1) },
];

/* ------------------------------------------- Mock aggregates (Insights screen) */

export const aggregateInsights: AggregateInsight[] = [
  {
    id: 'a1',
    type: 'handoff_time',
    label: 'Avg. time per handoff',
    value: '5m 29s',
    caption: 'How long it takes a nurse to get fully up to speed',
    deltaPct: -23,
    lowerIsBetter: true,
    sampleSize: 142,
    series: [432, 419, 401, 388, 372, 364, 351, 329],
  },
  {
    id: 'a2',
    type: 'task_completion',
    label: 'Avg. task completion',
    value: '10m 02s',
    caption: 'From task created to marked done',
    deltaPct: -11,
    lowerIsBetter: true,
    sampleSize: 318,
    series: [680, 672, 651, 658, 640, 631, 619, 602],
  },
  {
    id: 'a3',
    type: 'response_time',
    label: 'Avg. response time',
    value: '1m 13s',
    caption: 'Time to first teammate reply in a Circle',
    deltaPct: -34,
    lowerIsBetter: true,
    sampleSize: 205,
    series: [112, 104, 98, 89, 81, 79, 76, 73],
  },
  {
    id: 'a4',
    type: 'circle_setup',
    label: 'Avg. Circle setup',
    value: '47s',
    caption: 'Time to create a Circle and invite the team',
    deltaPct: -8,
    lowerIsBetter: true,
    sampleSize: 64,
    series: [54, 52, 51, 49, 50, 48, 47, 47],
  },
];
