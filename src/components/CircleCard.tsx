/* A patient Circle as it appears in the My Shift list: patient + room, status,
   one-line reason, who's in the Circle, open tasks, and time since last update.
   Pulses softly when there's live activity. */

import { CheckSquare, ChevronRight, Users } from 'lucide-react';
import { timeAgo } from '../lib/format';
import { statusMeta, toneVar } from '../lib/meta';
import type { Circle, Nurse } from '../types/models';
import { AvatarStack } from './Avatar';
import { StatusBadge } from './StatusBadge';

interface CircleCardProps {
  circle: Circle;
  members: Nurse[];
  openTasks: number;
  onOpen: () => void;
}

export function CircleCard({ circle, members, openTasks, onOpen }: CircleCardProps) {
  const p = circle.patient;
  // A status-colored left edge — quick severity coding, like a triage board.
  const accent = toneVar[statusMeta[circle.status].tone];
  return (
    <button
      className={`circle-card card ${circle.hasLiveActivity ? 'has-live' : ''}`}
      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
      onClick={onOpen}
    >
      <div className="row between gap-2 circle-card-top">
        <span className="room-pill sm">Room {p.room}</span>
        <div className="row gap-2">
          {circle.hasLiveActivity && (
            <span className="live-tag">
              <span className="live-dot live-pulse" />
              Live
            </span>
          )}
          <StatusBadge status={circle.status} />
        </div>
      </div>

      <h3 className="circle-card-name truncate">{p.name}</h3>
      <p className="circle-card-reason">{circle.reason}</p>

      <div className="row between circle-card-foot">
        <div className="row gap-2">
          <AvatarStack nurses={members} size={26} />
          <span className="foot-meta">
            <Users size={13} /> {members.length}
          </span>
          {openTasks > 0 && (
            <span className="foot-meta">
              <CheckSquare size={13} /> {openTasks}
            </span>
          )}
        </div>
        <div className="row gap-1 foot-meta">
          {timeAgo(circle.lastUpdateAt)}
          <ChevronRight size={16} className="t-faint" />
        </div>
      </div>
    </button>
  );
}
