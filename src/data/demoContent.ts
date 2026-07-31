/* =============================================================================
   Vitali Health AI — Unified demo content (single source for the demo surfaces)
   -----------------------------------------------------------------------------
   Everything the marketing/landing, Training, Insights (admin), About, and tour
   surfaces render lives here, keyed to the SAME Circles the live app uses
   (mockData.ts: c214 = room to improve, c118 = the exemplar). That continuity —
   one Circle flowing from the shift, into the AI review, into the hospital
   rollups — is the product story.

   All of it is invented sample data. No real patients, nurses, or hospitals.

   // TODO: real AI pipeline replaces this module — transcription of session
   //       audio, event-timeline interpretation, benchmark comparison, and
   //       coaching generation land in these same shapes.
   ============================================================================= */

export interface ReviewAnnotation {
  t: number; // seconds into the recording
  kind: 'good' | 'warn';
  head: string;
  text: string; // may contain <b> emphasis
}

export interface ReviewImprovement {
  cat: string;
  t: string;
  head: string;
  text: string; // may contain <em> emphasis
}

export interface ReviewMetric {
  name: string;
  session: number;
  bench: number;
  unit: string;
  max: number;
  higherBetter?: boolean;
  hit?: boolean;
  fmt?: 'hm';
  note?: string;
  noteT?: number;
}

export interface ReviewComment {
  who: string;
  role: string;
  ava: string;
  likes: number;
  text: string;
  mine?: boolean;
}

export interface TrainingSessionContent {
  circleId: 'c214' | 'c118';
  title: string;
  sub: string;
  room: string;
  chip: string;
  duration: number;
  summary: string;
  improveTitle: string;
  improveHint: string;
  annotations: ReviewAnnotation[];
  improvements: ReviewImprovement[];
  metrics: ReviewMetric[];
  comments: ReviewComment[];
}

export const trainingSessions: Record<string, TrainingSessionContent> = {
  c214: {
    circleId: 'c214',
    title: 'Room 214 · Caffeine toxicity · IV fluids',
    sub: 'Tuesday night · team of 4 nurses · resolved, with room to improve',
    room: 'Room 214 · Session recording',
    chip: '3 coaching moments',
    duration: 380, // 6:20
    summary:
      `A patient arrived needing IV fluids for caffeine toxicity. Four nurses coordinated over the shift and the ` +
      `case <b>resolved safely</b> — but the patient waited <b>5 hours 32 minutes</b> for what similar teams finish ` +
      `in under three. The delay didn't come from one big mistake: it came from small seams — an unconfirmed ` +
      `handoff, repeated questions, and supplies staged late. Each one is fixable, and each is called out below.`,
    improveTitle: '⚡ What could have been better',
    improveHint: 'Not just speed — communication, sequencing, and safety. Each note links to the moment it happened.',
    annotations: [
      { t: 42, kind: 'good', head: 'Strong start',
        text: '<b>Maria created the Circle</b> and logged allergy info and chief complaint clearly before anyone entered the room. That context should carry the whole case.' },
      { t: 75, kind: 'warn', head: 'Handoff — flagged items not confirmed',
        text: 'During handoff to the second nurse, the <b>allergy note wasn’t verbally confirmed</b>; the incoming nurse re-asked the patient. Better move: a 10-second verbal confirmation of flagged items at every handoff.' },
      { t: 123, kind: 'warn', head: 'Third repeat of the same questions',
        text: 'The patient was asked their <b>name and history for the 3rd time</b>. All of it was already in the Circle — one tap away. This is exactly the repetition the shared context exists to eliminate.' },
      { t: 210, kind: 'warn', head: 'Supplies staged late',
        text: '<b>IV placement was delayed</b> because supplies weren’t staged in advance. Better move: stage supplies while reviewing the Circle, before entering the room.' },
      { t: 250, kind: 'good', head: 'Clean call-out on the line',
        text: 'Clear walkie-talkie call-out when the line was in, so the <b>whole team stayed in sync</b> without stepping into the room.' },
    ],
    improvements: [
      { cat: 'Safety · handoff completeness', t: '1:15',
        head: 'Confirm flagged items out loud at handoff',
        text: 'The allergy flag was in the Circle but never verbally confirmed — that’s how allergy information gets lost. <em>The fix costs 10 seconds and closes a real safety gap.</em> This isn’t about speed.' },
      { cat: 'Communication', t: '2:03',
        head: 'Trust the shared context instead of re-asking',
        text: 'Three nurses asked the patient overlapping questions instead of reading the Circle. <em>Reading before entering</em> spares the patient and frees minutes of nurse time.' },
      { cat: 'Sequencing', t: '3:30',
        head: 'Stage supplies before entering',
        text: 'Supplies were gathered after the room assessment, adding <em>~8 minutes</em> to IV placement. Staging while reviewing the Circle would have run these steps in parallel.' },
    ],
    metrics: [
      { name: 'Time to IV placement', session: 31, bench: 12, unit: 'min', max: 35,
        note: 'Driven by late staging — <b>see 3:30</b>', noteT: 210 },
      { name: 'Repeated questions to patient', session: 3, bench: 0, unit: '', max: 4 },
      { name: 'Handoff completeness', session: 60, bench: 100, unit: '%', max: 100, higherBetter: true },
      { name: 'Total patient wait', session: 332, bench: 160, unit: 'min', max: 350, fmt: 'hm' },
    ],
    comments: [
      { who: 'Aisha', role: 'RN', ava: 'A', likes: 12,
        text: 'The handoff confirmation thing is so real. We lose allergy info this way all the time. Going to start doing the 10-second verbal check.' },
      { who: 'Daniel', role: 'RN · ICU', ava: 'D', likes: 8,
        text: 'Staging supplies first sounds obvious but I never think to do it under pressure. Watching it laid out like this actually helps.' },
      { who: 'Priya', role: 'RN', ava: 'P', likes: 15,
        text: 'Wish every floor reviewed shifts like this. You never get to see what you could’ve done better in the moment.' },
      { who: 'Marcus', role: 'RN · intern', ava: 'M', likes: 21,
        text: 'As a new grad this is gold. I learned more from this 6-min review than a week of orientation.' },
    ],
  },

  c118: {
    circleId: 'c118',
    title: 'Room 118 · Dehydration · IV fluids',
    sub: 'James Okafor, RN & team · the model run — featured lesson',
    room: 'Room 118 · Session recording',
    chip: '★ 1,247 nurses trained',
    duration: 285, // 4:45
    summary:
      `A similar IV-fluids case, handled the way the workflow is meant to go: <b>IV placed in 11 minutes</b>, ` +
      `patient discharged in <b>2 hours 25 minutes</b>, and <b>zero repeated questions</b>. Nothing here was rushed — ` +
      `the time came from sequencing and communication, not speed. That’s why this session became a lesson: ` +
      `it’s a repeatable pattern, not a heroic one-off.`,
    improveTitle: '🏆 What made this the model',
    improveHint: 'The habits Vita extracted — each one transferable to your next similar case.',
    annotations: [
      { t: 35, kind: 'good', head: 'Circle created with full context',
        text: 'Chief complaint, allergies, and history logged <b>before first contact</b> — every teammate started informed.' },
      { t: 62, kind: 'good', head: 'Allergies confirmed out loud',
        text: 'At handoff, flagged items were <b>verbally confirmed in seconds</b> — no re-asking the patient, no safety gap.' },
      { t: 108, kind: 'good', head: 'Supplies staged before entry',
        text: 'The IV kit was staged <b>while reviewing the Circle</b>, so assessment and setup ran in parallel.' },
      { t: 160, kind: 'good', head: 'Tight walkie coordination',
        text: 'Short, precise call-outs kept the team synced <b>without anyone leaving their task</b>.' },
      { t: 252, kind: 'good', head: 'Clean closing note',
        text: 'The closing summary made the next shift’s pickup trivial — <b>the record teaches by itself</b>.' },
    ],
    improvements: [
      { cat: 'Habit 1 · Sequencing', t: '1:48', head: 'Stage before you enter',
        text: 'Setup happened in parallel with review, not after it. <em>This one habit saved ~8 minutes</em> versus the average similar case.' },
      { cat: 'Habit 2 · Safety', t: '1:02', head: 'Confirm flagged items out loud, every handoff',
        text: 'Ten seconds of verbal confirmation kept the allergy chain intact across all three handoffs.' },
      { cat: 'Habit 3 · Communication', t: '0:35', head: 'Trust the shared context',
        text: 'No nurse re-asked what the Circle already knew — <em>zero repeated questions</em>, calmer patient, faster run.' },
    ],
    metrics: [
      { name: 'Time to IV placement', session: 11, bench: 12, unit: 'min', max: 35, hit: true },
      { name: 'Repeated questions to patient', session: 0, bench: 0, unit: '', max: 4, hit: true },
      { name: 'Handoff completeness', session: 100, bench: 100, unit: '%', max: 100, higherBetter: true, hit: true },
      { name: 'Total patient wait', session: 145, bench: 160, unit: 'min', max: 350, fmt: 'hm', hit: true },
    ],
    comments: [
      { who: 'Elena', role: 'RN', ava: 'E', likes: 34,
        text: 'I’ve watched this three times. The staging-while-reviewing move changed how I set up every room now.' },
      { who: 'Tomas', role: 'RN · float pool', ava: 'T', likes: 19,
        text: 'What strikes me is how calm it is. Nobody rushes — the minutes come from the sequence, not the pace.' },
    ],
  },
};

/* -------------------------------------------------- one-to-many scale story */
export const scaleStory = {
  sourceCircleId: 'c118',
  nursesTrained: 1247,
  hospitals: 42,
  ivFaster: '+19%',
  repeatsDown: '−74%',
  lesson:
    '“Stage before you enter, confirm flagged items out loud at every handoff, and trust the shared context instead ' +
    'of re-asking. These three habits cut this case\'s time nearly in half — without rushing.”',
  lessonBy: '— Extracted from Room 118 (James Okafor, RN) · verified against 3,400 similar IV-fluid cases',
};

/* ------------------------------------------- Training home dashboard (Maria) */
export const trainingHome = {
  reviewedThisWeek: 3,
  stats: [
    { num: '18', lbl: 'Lessons completed', sub: '+4 this week' },
    { num: 'IV placement', lbl: 'Top skill improving', sub: '22% faster than last month' },
    { num: '6 days', lbl: 'Learning streak', sub: 'Longest yet 🔥' },
    { num: 'Top 15%', lbl: 'Among peers on 4 West', sub: 'Quietly climbing', quiet: true },
  ],
  teamFeedExtras: [
    { title: 'Room 302 · Sepsis escalation done right', meta: 'Amara Diallo, RN · 892 nurses trained' },
    { title: 'Room 141 · Calm de-escalation, family at bedside', meta: 'Rosa Delgado, RN · 613 nurses trained' },
  ],
};

/* --------------------------------------------- Insights (hospital admin) view */
export const impact = {
  headline: [
    { name: 'Time to IV placement', now: '14 min', was: '26 min', delta: '−46%', good: true },
    { name: 'Handoff completeness', now: '92%', was: '61%', delta: '+31 pts', good: true },
    { name: 'Repeated questions / case', now: '0.6', was: '2.8', delta: '−79%', good: true },
    { name: 'Avg. patient wait (IV fluids)', now: '2h 51m', was: '4h 48m', delta: '−41%', good: true },
  ],
  // 8 weeks since training rollout — before/after arc for the trend charts.
  weeks: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
  trends: [
    { name: 'Time to IV placement (min)', series: [26, 25, 23, 20, 18, 16, 15, 14], lowerIsBetter: true },
    { name: 'Handoff completeness (%)', series: [61, 64, 70, 76, 82, 86, 90, 92], lowerIsBetter: false },
    { name: 'Repeated questions per case', series: [2.8, 2.6, 2.1, 1.7, 1.3, 1.0, 0.8, 0.6], lowerIsBetter: true },
    { name: 'Lessons completed (unit, cumulative)', series: [12, 31, 58, 96, 140, 178, 214, 247], lowerIsBetter: false },
  ],
  rolloutWeek: 2, // training went live at the start of W3 (index 2)
  value: [
    { head: 'Measurably faster care', text: 'Wait and task times fall week over week — and you can see exactly which habits moved them.' },
    { head: 'Better-trained staff', text: 'Every strong shift becomes a lesson. Coaching comes from your own floor, not generic modules.' },
    { head: 'Interns onboard faster', text: 'New nurses learn from real reviewed cases — “a week of orientation in a six-minute review.”' },
    { head: 'Data the hospital owns', text: 'Process metrics stay yours, contained by contract, with patient identity kept out of analytics entirely.' },
  ],
};

/* ------------------------------------------------------------ guided tour */
export interface TourStep {
  path: string;
  title: string;
  text: string;
}

export const tourSteps: TourStep[] = [
  { path: '/', title: '1 · The problem',
    text: 'Nurses work in silos. Patients repeat their name, symptoms, and history to every new face; context slips between staff. Vitali exists to close those seams.' },
  { path: '/create', title: '2 · A nurse creates a Circle',
    text: 'One fast form: who the patient is, why they’re here, what’s flagged — then invite the team by nurse ID. Under a minute, and everyone starts informed.' },
  { path: '/circle/c214', title: '3 · The team coordinates — and everything is captured',
    text: 'Full context up top, a timestamped timeline, walkie-talkie sync. Quietly, Vitali records timings, handoffs, and repeated questions. This Circle — Room 214 — is the one we’ll follow.' },
  { path: '/training/session/c214', title: '4 · The AI reviews the session and coaches',
    text: 'After discharge, Vita replays Room 214: what happened, what went well, and what could’ve been better — across communication, sequencing, and safety, each tied to a timestamp.' },
  { path: '/training/scale', title: '5 · One session trains 1,247 nurses',
    text: 'When a team nails a case — Room 118 — Vita extracts the transferable lesson and routes it to every nurse who faces similar cases. One good night becomes everyone’s baseline.' },
  { path: '/impact', title: '6 · The hospital sees the improvement',
    text: 'Anonymized process metrics — no patient identity — show the curve bend after training rolls out: faster IVs, complete handoffs, fewer repeated questions.' },
  { path: '/', title: '7 · The loop repeats and compounds',
    text: 'Coordination generates data → data becomes training → training makes nurses better → better nurses generate better data. Vitali gets smarter every shift. Explore freely from here.' },
];
