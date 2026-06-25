/* Open + completed tasks for a Circle. Completing a task quietly records how
   long it took (handled in the data layer) — shown here as a small duration chip. */

import { Check } from 'lucide-react';
import { duration } from '../lib/format';
import { taskCategoryMeta } from '../lib/meta';
import type { Nurse, Task } from '../types/models';

interface TaskListProps {
  tasks: Task[];
  getNurse: (id: string) => Nurse | undefined;
  currentNurseId: string;
  onComplete: (taskId: string) => void;
}

export function TaskList({ tasks, getNurse, currentNurseId, onComplete }: TaskListProps) {
  // Open tasks first (oldest first), then completed (most recent first).
  const ordered = [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    if (a.status === 'open') return a.createdAt.localeCompare(b.createdAt);
    return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
  });

  if (tasks.length === 0) {
    return <p className="t-faint empty-line">No tasks yet.</p>;
  }

  return (
    <ul className="task-list">
      {ordered.map((t) => {
        const { Icon, label } = taskCategoryMeta[t.category];
        const done = t.status === 'done';
        const assignee = t.assigneeId ? getNurse(t.assigneeId) : undefined;
        const assigneeLabel = assignee
          ? assignee.id === currentNurseId
            ? 'You'
            : assignee.name.split(' ')[0]
          : null;
        return (
          <li key={t.id} className={`task-item ${done ? 'is-done' : ''}`}>
            <button
              className={`task-check ${done ? 'is-done' : ''}`}
              aria-label={done ? 'Completed' : `Mark "${t.label}" done`}
              disabled={done}
              onClick={() => onComplete(t.id)}
            >
              {done && <Check size={15} strokeWidth={3} />}
            </button>
            <div className="task-main grow">
              <span className="task-label">{t.label}</span>
              <span className="task-sub t-faint">
                <Icon size={12} /> {label}
                {assigneeLabel && ` · ${assigneeLabel}`}
              </span>
            </div>
            {done && t.durationMs != null && (
              <span className="chip chip-ok">{duration(t.durationMs)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
