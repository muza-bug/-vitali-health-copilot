/* =============================================================================
   Vitali Health AI — App store
   A thin reactive layer over services/api.ts. Screens read state and call actions
   from here via the `useApp()` hook; they never touch the API service directly.
   Swapping the backend stays a services/ concern — this file doesn't change.
   ============================================================================= */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../services/api';
import { alertSlack } from '../services/connectors';
import { driftVitals, notableChange } from '../services/liveData';
import { publish, subscribeAll, type RealtimeEvent } from '../services/realtime';
import type {
  Circle,
  CircleStatus,
  ID,
  Nurse,
  PatientFlag,
  Shift,
  Task,
  TaskCategory,
  TimelineEntry,
  TrainingCase,
  TrainingDebrief,
  Vitals,
  VoiceMessage,
} from '../types/models';

interface AppState {
  status: 'loading' | 'ready';
  currentNurse: Nurse | null;
  shift: Shift | null;
  nurses: Nurse[];
  circles: Circle[];
  timeline: TimelineEntry[];
  tasks: Task[];
  voice: VoiceMessage[];
  /** Discharged cases archived for the Learn tab. */
  training: TrainingCase[];
  /** Live bedside-monitor stream on/off (see services/liveData.ts). */
  live: boolean;
}

/** Pseudo-author id for entries written by the live monitor (not a nurse). */
export const MONITOR_ID = 'monitor';

interface AppActions {
  // selectors
  getNurse: (id: ID) => Nurse | undefined;
  getCircle: (id: ID) => Circle | undefined;
  getTrainingCase: (id: ID) => TrainingCase | undefined;
  timelineFor: (circleId: ID) => TimelineEntry[];
  tasksFor: (circleId: ID) => Task[];
  voiceFor: (circleId: ID) => VoiceMessage[];
  membersFor: (circle: Circle) => Nurse[];
  // actions
  createCircle: (input: CreateCircleInput) => Promise<ID>;
  addUpdate: (circleId: ID, text: string) => Promise<void>;
  changeStatus: (circleId: ID, status: CircleStatus) => Promise<void>;
  addTask: (circleId: ID, label: string, category: TaskCategory) => Promise<void>;
  completeTask: (taskId: ID) => Promise<void>;
  joinCircle: (circleId: ID) => Promise<void>;
  addMember: (circleId: ID, nurseId: ID) => Promise<void>;
  saveDebrief: (caseId: ID, debrief: TrainingDebrief) => Promise<void>;
  setPhoto: (photoUrl: string | null) => Promise<void>;
  sendVoiceMessage: (
    circleId: ID,
    durationSec: number,
    transcript?: string | null,
    audioUrl?: string | null,
  ) => Promise<void>;
  setPresence: (online: boolean) => void;
  setStatusNote: (note: string) => void;
  setAvatarHue: (hue: number) => void;
  setLive: (on: boolean) => void;
}

export interface CreateCircleInput {
  patientName: string;
  room: string;
  reason: string;
  notes: string;
  status: CircleStatus;
  allergies: string[];
  memberIds: ID[];
  setupMs?: number;
  // Optional richer context when pulled from the EHR.
  age?: number;
  sex?: 'F' | 'M' | 'X';
  mrn?: string;
  vitals?: Vitals;
  flags?: PatientFlag[];
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    status: 'loading',
    currentNurse: null,
    shift: null,
    nurses: [],
    circles: [],
    timeline: [],
    tasks: [],
    voice: [],
    training: [],
    live: true,
  });

  // Hydrate from the data service once on mount.
  useEffect(() => {
    let alive = true;
    api.bootstrap().then((data) => {
      if (!alive) return;
      setState((s) => ({ ...s, status: 'ready', ...data }));
    });
    return () => {
      alive = false;
    };
  }, []);

  /* --------------------------------------------------- real-time (apply) */
  // Merge an event broadcast by another open window into local state.
  const applyRemoteEvent = useCallback((event: RealtimeEvent) => {
    setState((s) => {
      switch (event.kind) {
        case 'timeline': {
          const timeline = s.timeline.some((t) => t.id === event.entry.id)
            ? s.timeline
            : [...s.timeline, event.entry];
          return {
            ...s,
            timeline,
            circles: s.circles.map((c) =>
              c.id === event.circleId
                ? {
                    ...c,
                    lastUpdateAt: event.lastUpdateAt,
                    ...(event.status ? { status: event.status } : {}),
                    ...(event.memberIds ? { memberIds: event.memberIds } : {}),
                    hasLiveActivity: true,
                  }
                : c,
            ),
          };
        }
        case 'task': {
          const exists = s.tasks.some((t) => t.id === event.task.id);
          return {
            ...s,
            tasks: exists
              ? s.tasks.map((t) => (t.id === event.task.id ? event.task : t))
              : [...s.tasks, event.task],
            circles: s.circles.map((c) =>
              c.id === event.circleId
                ? { ...c, lastUpdateAt: event.lastUpdateAt, hasLiveActivity: true }
                : c,
            ),
          };
        }
        case 'voice': {
          return {
            ...s,
            voice: s.voice.some((v) => v.id === event.voice.id)
              ? s.voice
              : [...s.voice, event.voice],
            circles: s.circles.map((c) =>
              c.id === event.circleId
                ? { ...c, lastUpdateAt: event.lastUpdateAt, hasLiveActivity: true }
                : c,
            ),
          };
        }
        case 'circle': {
          if (s.circles.some((c) => c.id === event.circle.id)) return s;
          return { ...s, circles: [{ ...event.circle, hasLiveActivity: true }, ...s.circles] };
        }
        case 'presence': {
          return {
            ...s,
            nurses: s.nurses.map((n) =>
              n.id === event.nurseId ? { ...n, online: event.online } : n,
            ),
          };
        }
        default:
          return s;
      }
    });

    // Let the "live" pulse fade after a few seconds.
    if (event.kind === 'timeline' || event.kind === 'task' || event.kind === 'voice') {
      const cid = event.circleId;
      window.setTimeout(() => {
        setState((s) => ({
          ...s,
          circles: s.circles.map((c) => (c.id === cid ? { ...c, hasLiveActivity: false } : c)),
        }));
      }, 5000);
    }
  }, []);

  useEffect(() => subscribeAll(applyRemoteEvent), [applyRemoteEvent]);

  /* ----------------------------------------------- live monitor data stream */
  // A ref to the latest state so the interval never reads a stale closure.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!state.live) return;
    let ticks = 0;
    const handle = window.setInterval(() => {
      // Pause when the tab is hidden — no point burning cycles off-screen.
      if (typeof document !== 'undefined' && document.hidden) return;
      ticks += 1;

      const snapshot = stateRef.current;
      const active = snapshot.circles.filter(
        (c) => c.patient.vitals && (c.status === 'critical' || c.status === 'monitoring'),
      );
      if (active.length === 0) return;

      // Advance vitals for active Circles.
      const next = new Map<ID, Vitals>();
      for (const c of active) next.set(c.id, driftVitals(c.patient.vitals!));

      setState((s) => ({
        ...s,
        circles: s.circles.map((c) =>
          next.has(c.id)
            ? { ...c, patient: { ...c.patient, vitals: next.get(c.id)! }, hasLiveActivity: true }
            : c,
        ),
      }));
      // Let the live pulse fade.
      window.setTimeout(() => {
        setState((s) => ({
          ...s,
          circles: s.circles.map((c) => (next.has(c.id) ? { ...c, hasLiveActivity: false } : c)),
        }));
      }, 3500);

      // Every few ticks, log one notable clinical change to the timeline.
      if (ticks % 3 === 0) {
        for (const c of active) {
          const note = notableChange(c.patient.vitals!, next.get(c.id)!);
          if (!note) continue;
          const entry: TimelineEntry = {
            id: `lv${Date.now()}${Math.floor(Math.random() * 1000)}`,
            circleId: c.id,
            authorId: MONITOR_ID,
            kind: 'vitals',
            text: note,
            createdAt: new Date().toISOString(),
          };
          setState((s) => ({ ...s, timeline: [...s.timeline, entry] }));
          publish({ kind: 'timeline', circleId: c.id, entry, lastUpdateAt: entry.createdAt });
          // Critical patients also ping the team's Slack channel (if wired up).
          if (c.status === 'critical') alertSlack(c.patient.room, note);
          break; // one per cycle keeps the feed calm
        }
      }
    }, 6000);
    return () => window.clearInterval(handle);
  }, [state.live]);

  const me = state.currentNurse?.id ?? '';

  /* ----------------------------------------------------------- selectors */
  const getNurse = useCallback(
    (id: ID) => state.nurses.find((n) => n.id === id),
    [state.nurses],
  );
  const getCircle = useCallback(
    (id: ID) => state.circles.find((c) => c.id === id),
    [state.circles],
  );
  const getTrainingCase = useCallback(
    (id: ID) => state.training.find((t) => t.id === id),
    [state.training],
  );
  const timelineFor = useCallback(
    (circleId: ID) =>
      state.timeline
        .filter((t) => t.circleId === circleId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.timeline],
  );
  const tasksFor = useCallback(
    (circleId: ID) => state.tasks.filter((t) => t.circleId === circleId),
    [state.tasks],
  );
  const voiceFor = useCallback(
    (circleId: ID) =>
      state.voice
        .filter((v) => v.circleId === circleId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.voice],
  );
  const membersFor = useCallback(
    (circle: Circle) =>
      circle.memberIds
        .map((id) => state.nurses.find((n) => n.id === id))
        .filter((n): n is Nurse => Boolean(n)),
    [state.nurses],
  );

  /* ------------------------------------------------------------- actions */
  const bumpCircle = (circleId: ID, lastUpdateAt: string, extra?: Partial<Circle>) =>
    setState((s) => ({
      ...s,
      circles: s.circles.map((c) =>
        c.id === circleId ? { ...c, lastUpdateAt, ...extra } : c,
      ),
    }));

  const createCircle = useCallback(
    async (input: CreateCircleInput) => {
      const { circle, entry } = await api.createCircle({ ...input, createdBy: me });
      setState((s) => ({
        ...s,
        circles: [circle, ...s.circles],
        timeline: [...s.timeline, entry],
      }));
      publish({ kind: 'circle', circle });
      publish({ kind: 'timeline', circleId: circle.id, entry, lastUpdateAt: circle.lastUpdateAt });
      return circle.id;
    },
    [me],
  );

  const addUpdate = useCallback(
    async (circleId: ID, text: string) => {
      const { entry, lastUpdateAt } = await api.addUpdate(circleId, me, text);
      setState((s) => ({ ...s, timeline: [...s.timeline, entry] }));
      bumpCircle(circleId, lastUpdateAt);
      publish({ kind: 'timeline', circleId, entry, lastUpdateAt });
    },
    [me],
  );

  const changeStatus = useCallback(
    async (circleId: ID, status: CircleStatus) => {
      const res = await api.changeStatus(circleId, status, me);
      setState((s) => ({ ...s, timeline: [...s.timeline, res.entry] }));
      bumpCircle(circleId, res.lastUpdateAt, { status: res.status });
      publish({
        kind: 'timeline',
        circleId,
        entry: res.entry,
        lastUpdateAt: res.lastUpdateAt,
        status: res.status,
      });

      // Discharge closes the episode: the whole record (timeline, tasks,
      // recordings) is archived as a training case for the Learn tab.
      if (status === 'discharge') {
        const snap = stateRef.current;
        const circle = snap.circles.find((c) => c.id === circleId);
        if (!circle) return;
        const tc = await api.archiveCase({
          circle: { ...circle, status },
          timeline: [...snap.timeline, res.entry].filter((t) => t.circleId === circleId),
          tasks: snap.tasks.filter((t) => t.circleId === circleId),
          voice: snap.voice.filter((v) => v.circleId === circleId),
          unit: snap.shift?.unit ?? circle.patient.room,
        });
        setState((s) => ({
          ...s,
          training: s.training.some((t) => t.id === tc.id) ? s.training : [tc, ...s.training],
        }));
      }
    },
    [me],
  );

  const addTask = useCallback(
    async (circleId: ID, label: string, category: TaskCategory) => {
      const { task, entry } = await api.addTask({
        circleId,
        label,
        category,
        createdBy: me,
      });
      setState((s) => ({
        ...s,
        tasks: [...s.tasks, task],
        timeline: [...s.timeline, entry],
      }));
      bumpCircle(circleId, entry.createdAt);
      publish({ kind: 'task', circleId, task, lastUpdateAt: entry.createdAt });
      publish({ kind: 'timeline', circleId, entry, lastUpdateAt: entry.createdAt });
    },
    [me],
  );

  const completeTask = useCallback(
    async (taskId: ID) => {
      const res = await api.completeTask(taskId, me);
      if (!res) return;
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === res.task.id ? res.task : t)),
        timeline: [...s.timeline, res.entry],
      }));
      bumpCircle(res.task.circleId, res.entry.createdAt);
      publish({ kind: 'task', circleId: res.task.circleId, task: res.task, lastUpdateAt: res.entry.createdAt });
      publish({
        kind: 'timeline',
        circleId: res.task.circleId,
        entry: res.entry,
        lastUpdateAt: res.entry.createdAt,
      });
    },
    [me],
  );

  const joinCircle = useCallback(
    async (circleId: ID) => {
      const { memberIds, entry } = await api.joinCircle(circleId, me);
      setState((s) => ({ ...s, timeline: [...s.timeline, entry] }));
      bumpCircle(circleId, entry.createdAt, { memberIds });
      publish({ kind: 'timeline', circleId, entry, lastUpdateAt: entry.createdAt, memberIds });
    },
    [me],
  );

  // Add a teammate to a Circle by their nurse ID code.
  const addMember = useCallback(async (circleId: ID, nurseId: ID) => {
    const { memberIds, entry } = await api.addMember(circleId, nurseId);
    setState((s) => ({ ...s, timeline: [...s.timeline, entry] }));
    bumpCircle(circleId, entry.createdAt, { memberIds });
    publish({ kind: 'timeline', circleId, entry, lastUpdateAt: entry.createdAt, memberIds });
  }, []);

  // Attach the Training coach's debrief to an archived case.
  const saveDebrief = useCallback(async (caseId: ID, debrief: TrainingDebrief) => {
    await api.saveDebrief(caseId, debrief);
    setState((s) => ({
      ...s,
      training: s.training.map((t) => (t.id === caseId ? { ...t, debrief } : t)),
    }));
  }, []);

  const sendVoiceMessage = useCallback(
    async (
      circleId: ID,
      durationSec: number,
      transcript?: string | null,
      audioUrl?: string | null,
    ) => {
      const { voice, entry } = await api.recordVoiceMessage({
        circleId,
        senderId: me,
        durationSec,
        transcript,
        audioUrl,
      });
      setState((s) => ({
        ...s,
        voice: [...s.voice, voice],
        timeline: [...s.timeline, entry],
      }));
      bumpCircle(circleId, voice.createdAt);
      // Broadcast without the object URL — it isn't valid in another document.
      publish({ kind: 'voice', circleId, voice: { ...voice, audioUrl: null }, lastUpdateAt: voice.createdAt });
      publish({ kind: 'timeline', circleId, entry, lastUpdateAt: voice.createdAt });
    },
    [me],
  );

  const setPresence = useCallback(
    (online: boolean) => {
      setState((s) => ({
        ...s,
        currentNurse: s.currentNurse ? { ...s.currentNurse, online } : s.currentNurse,
        nurses: s.nurses.map((n) => (n.id === me ? { ...n, online } : n)),
      }));
      publish({ kind: 'presence', nurseId: me, online });
    },
    [me],
  );

  // Profile customizations — update both currentNurse and the directory entry.
  // TODO: persist via the (real) user/profile service.
  const updateMe = useCallback(
    (patch: Partial<Nurse>) =>
      setState((s) => ({
        ...s,
        currentNurse: s.currentNurse ? { ...s.currentNurse, ...patch } : s.currentNurse,
        nurses: s.nurses.map((n) => (n.id === me ? { ...n, ...patch } : n)),
      })),
    [me],
  );
  const setStatusNote = useCallback((note: string) => updateMe({ statusNote: note }), [updateMe]);
  const setAvatarHue = useCallback((hue: number) => updateMe({ avatarHue: hue }), [updateMe]);
  // Profile photo — persisted per device via the API seam.
  const setPhoto = useCallback(
    async (photoUrl: string | null) => {
      await api.setPhoto(me, photoUrl);
      updateMe({ photoUrl: photoUrl ?? undefined });
    },
    [me, updateMe],
  );
  const setLive = useCallback((on: boolean) => setState((s) => ({ ...s, live: on })), []);

  const value = useMemo(
    () => ({
      ...state,
      getNurse,
      getCircle,
      getTrainingCase,
      timelineFor,
      tasksFor,
      voiceFor,
      membersFor,
      createCircle,
      addUpdate,
      changeStatus,
      addTask,
      completeTask,
      joinCircle,
      addMember,
      saveDebrief,
      sendVoiceMessage,
      setPresence,
      setStatusNote,
      setAvatarHue,
      setPhoto,
      setLive,
    }),
    [
      state,
      getNurse,
      getCircle,
      getTrainingCase,
      timelineFor,
      tasksFor,
      voiceFor,
      membersFor,
      createCircle,
      addUpdate,
      changeStatus,
      addTask,
      completeTask,
      joinCircle,
      addMember,
      saveDebrief,
      sendVoiceMessage,
      setPresence,
      setStatusNote,
      setAvatarHue,
      setPhoto,
      setLive,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Access app state + actions. Must be used within <AppProvider>. */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}
