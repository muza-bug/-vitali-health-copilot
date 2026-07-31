/* The Circle activity feed: a timestamped, rail-connected list of everything
   that happened — notes, status changes, tasks, voice clips, and live vitals.
   Notes render in full; everything else is a compact one-liner. */

import {
  Activity,
  Check,
  HeartPulse,
  Mic,
  MessageSquare,
  Plus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { clock, duration } from '../lib/format';
import type { Nurse, TimelineEntry, TimelineKind } from '../types/models';

type NodeTone = 'ok' | 'warn' | 'cyan' | 'dim' | '';

const kindMeta: Record<TimelineKind, { Icon: LucideIcon; node: NodeTone }> = {
  note: { Icon: MessageSquare, node: '' },
  status: { Icon: Activity, node: 'cyan' },
  'task-open': { Icon: Plus, node: 'dim' },
  'task-done': { Icon: Check, node: 'ok' },
  join: { Icon: UserPlus, node: 'dim' },
  voice: { Icon: Mic, node: 'cyan' },
  vitals: { Icon: HeartPulse, node: 'warn' },
};

interface TimelineProps {
  entries: TimelineEntry[];
  getNurse: (id: string) => Nurse | undefined;
  currentNurseId: string;
}

export function Timeline({ entries, getNurse, currentNurseId }: TimelineProps) {
  if (entries.length === 0) {
    return <p className="t-faint empty-line">No activity yet.</p>;
  }

  // Newest at the bottom reads like a running log a nurse scrolls down through.
  return (
    <div className="timeline">
      {entries.map((e) => {
        const { Icon, node } = kindMeta[e.kind] ?? kindMeta.note;
        const author = getNurse(e.authorId);
        const name =
          e.kind === 'vitals'
            ? 'Bedside monitor'
            : author
              ? author.id === currentNurseId
                ? 'You'
                : author.name.split(' ')[0]
              : 'Someone';
        const nodeClass = node ? `is-${node}` : '';
        return (
          <div key={e.id} className="tl-item">
            <span className={`tl-node ${nodeClass}`}>
              <Icon size={14} strokeWidth={2.2} />
            </span>
            <div className="tl-body">
              {e.kind === 'note' ? (
                <>
                  <div className="tl-head">
                    <span className="tl-author">{name}</span>
                    <span className="tl-time t-faint">{clock(e.createdAt)}</span>
                  </div>
                  <p className="tl-note">{e.text}</p>
                </>
              ) : (
                <div className="tl-line">
                  <span>
                    <span className="tl-author">{name}</span>{' '}
                    <span className="t-dim">{lineText(e)}</span>
                    {e.kind === 'task-done' && e.durationMs != null && (
                      <span className="chip chip-ok tl-dur">{duration(e.durationMs)}</span>
                    )}
                  </span>
                  <span className="tl-time t-faint">{clock(e.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Human phrasing for the non-note one-liners. */
function lineText(e: TimelineEntry): string {
  switch (e.kind) {
    case 'status':
      return e.text;
    case 'task-open':
      return `added task — ${e.text}`;
    case 'task-done':
      return `completed — ${e.text}`;
    case 'voice':
      return 'sent a voice message';
    case 'vitals':
      return e.text;
    case 'join':
    default:
      return e.text;
  }
}
