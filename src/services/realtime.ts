/* =============================================================================
   Vitali Health AI — Real-time channel (the live-sync seam)
   -----------------------------------------------------------------------------
   Broadcasts Circle activity between open windows/tabs so the demo feels live:
   open two tabs, add an update in one, watch it appear in the other. Backed by
   BroadcastChannel (no server needed). The event shapes are deliberately the
   same ones a real WebSocket / SSE transport would deliver, so going live means
   swapping ONLY the publish()/subscribeAll() bodies.

   >>> TODO: replace BroadcastChannel with a WebSocket to the realtime backend. <<<
   ============================================================================= */

import type {
  Circle,
  CircleStatus,
  ID,
  Task,
  TimelineEntry,
  VoiceMessage,
} from '../types/models';

export type RealtimeEvent =
  | {
      kind: 'timeline';
      circleId: ID;
      entry: TimelineEntry;
      lastUpdateAt: string;
      status?: CircleStatus;
      memberIds?: ID[];
    }
  | { kind: 'task'; circleId: ID; task: Task; lastUpdateAt: string }
  | { kind: 'voice'; circleId: ID; voice: VoiceMessage; lastUpdateAt: string }
  | { kind: 'circle'; circle: Circle }
  | { kind: 'presence'; nurseId: ID; online: boolean };

const CHANNEL = 'vitali.realtime';

/** Unique per tab so we can ignore our own echoes. */
const SOURCE_ID = Math.random().toString(36).slice(2);

type Handler = (event: RealtimeEvent) => void;

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

/** Broadcast a Circle event to every other open window. */
export function publish(event: RealtimeEvent): void {
  channel?.postMessage({ source: SOURCE_ID, event });
}

/**
 * Subscribe to every remote event. Returns an unsubscribe function (so callers
 * can use it directly in a React effect cleanup).
 */
export function subscribeAll(handler: Handler): () => void {
  if (!channel) return () => {};
  const listener = (e: MessageEvent) => {
    const data = e.data as { source?: string; event?: RealtimeEvent } | null;
    // Ignore our own messages — local state already reflects them.
    if (!data?.event || data.source === SOURCE_ID) return;
    handler(data.event);
  };
  channel.addEventListener('message', listener);
  return () => channel.removeEventListener('message', listener);
}
