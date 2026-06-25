/* Screen 4 — Circle detail (the heart of the app). Full patient context up top
   (no digging), then team, walkie-talkie, tasks, and a timestamped activity feed.
   Adding an update or marking a task done is always one tap away. */

import { ArrowLeftRight, ChevronRight, Plus, Radio } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Composer } from '../components/Composer';
import { AssistantPanel } from '../components/AssistantPanel';
import { PatientContext } from '../components/PatientContext';
import { PushToTalk } from '../components/PushToTalk';
import { ScreenHeader } from '../components/ScreenHeader';
import { TaskList } from '../components/TaskList';
import { Timeline } from '../components/Timeline';
import { VoiceLog } from '../components/VoiceLog';
import {
  statusMeta,
  STATUS_OPTIONS,
  TASK_CATEGORY_OPTIONS,
  taskCategoryMeta,
  toneChip,
} from '../lib/meta';
import { useApp } from '../store/AppContext';
import type { TaskCategory } from '../types/models';

// Live updates from other open windows are applied globally by the store
// (AppContext subscribes to the realtime channel), so this screen just renders
// state and stays in sync automatically.
export function CircleDetailScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const app = useApp();
  const circle = app.getCircle(id);

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskLabel, setTaskLabel] = useState('');
  const [taskCat, setTaskCat] = useState<TaskCategory>('assessment');

  if (!circle || !app.currentNurse) {
    return (
      <div className="screen">
        <ScreenHeader title="Circle" back backTo="/shift" />
        <p className="t-dim empty-line">This Circle is no longer available.</p>
      </div>
    );
  }

  const members = app.membersFor(circle);
  const tasks = app.tasksFor(circle.id);
  const openCount = tasks.filter((t) => t.status === 'open').length;
  const entries = app.timelineFor(circle.id);
  const recentVoice = app.voiceFor(circle.id).slice(0, 2);
  const isMember = circle.memberIds.includes(app.currentNurse.id);
  const recentNotes = entries.filter((e) => e.kind === 'note').slice(-6).map((e) => e.text);
  const openTaskLabels = tasks.filter((t) => t.status === 'open').map((t) => t.label);

  const addTask = async () => {
    const label = taskLabel.trim();
    if (!label) return;
    await app.addTask(circle.id, label, taskCat);
    setTaskLabel('');
    setShowAddTask(false);
  };

  return (
    <div className="screen detail">
      <ScreenHeader
        title={circle.patient.name}
        subtitle={`Room ${circle.patient.room}`}
        back
        backTo="/shift"
        right={
          <button
            className="icon-btn"
            aria-label="Handoff view"
            onClick={() => navigate(`/circle/${circle.id}/handoff`)}
          >
            <ArrowLeftRight size={20} />
          </button>
        }
      />

      <div className="detail-body">
        {/* Context-first */}
        <PatientContext circle={circle} />

        {/* Status */}
        <section className="card card-pad">
          <div className="section-title">Status</div>
          <div className="status-select">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                className={`status-opt ${
                  circle.status === s ? `is-active ${toneChip[statusMeta[s].tone]}` : ''
                }`}
                onClick={() => void app.changeStatus(circle.id, s)}
              >
                {statusMeta[s].label}
              </button>
            ))}
          </div>
        </section>

        {/* AI assistant — proactive agent on this Circle */}
        <AssistantPanel
          circle={circle}
          recentNotes={recentNotes}
          openTaskLabels={openTaskLabels}
          onAddTask={(label) => void app.addTask(circle.id, label, 'coordination')}
        />

        {/* Team */}
        <section className="card card-pad">
          <div className="row between">
            <div className="section-title" style={{ margin: 0 }}>
              Team · {members.length}
            </div>
            {!isMember && (
              <button className="link-btn" onClick={() => void app.joinCircle(circle.id)}>
                Join Circle
              </button>
            )}
          </div>
          <div className="team-row">
            {members.map((n) => (
              <div key={n.id} className="team-member">
                <Avatar nurse={n} size={42} showPresence />
                <span className="team-name">
                  {n.id === app.currentNurse!.id ? 'You' : n.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Walkie-talkie */}
        <section className="card card-pad walkie-card">
          <div className="row between">
            <div className="row gap-2">
              <Radio size={16} className="t-cyan" />
              <span className="card-h">Walkie-talkie</span>
            </div>
            <button
              className="link-btn"
              onClick={() => navigate(`/circle/${circle.id}/talk`)}
            >
              Open <ChevronRight size={14} />
            </button>
          </div>
          <PushToTalk
            circleId={circle.id}
            currentNurse={app.currentNurse}
            onSend={(clip) =>
              void app.sendVoiceMessage(circle.id, clip.durationSec, clip.transcript, clip.audioUrl)
            }
          />
          {recentVoice.length > 0 && (
            <VoiceLog
              messages={recentVoice}
              getNurse={app.getNurse}
              currentNurseId={app.currentNurse.id}
            />
          )}
        </section>

        {/* Tasks */}
        <section className="card card-pad">
          <div className="row between">
            <div className="section-title" style={{ margin: 0 }}>
              Tasks {openCount > 0 && <span className="t-cyan">· {openCount} open</span>}
            </div>
            <button className="link-btn" onClick={() => setShowAddTask((v) => !v)}>
              <Plus size={16} /> Add
            </button>
          </div>

          {showAddTask && (
            <div className="add-task">
              <input
                className="input"
                placeholder="What needs doing?"
                value={taskLabel}
                autoFocus
                onChange={(e) => setTaskLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void addTask()}
              />
              <div className="row gap-2 add-task-foot">
                <select
                  className="mini-select grow"
                  value={taskCat}
                  onChange={(e) => setTaskCat(e.target.value as TaskCategory)}
                >
                  {TASK_CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {taskCategoryMeta[c].label}
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary add-task-btn" onClick={() => void addTask()}>
                  Add task
                </button>
              </div>
            </div>
          )}

          <TaskList
            tasks={tasks}
            getNurse={app.getNurse}
            currentNurseId={app.currentNurse.id}
            onComplete={(taskId) => void app.completeTask(taskId)}
          />
        </section>

        {/* Activity timeline */}
        <section className="card card-pad">
          <div className="section-title">Activity</div>
          <Timeline
            entries={entries}
            getNurse={app.getNurse}
            currentNurseId={app.currentNurse.id}
          />
        </section>
      </div>

      {/* Add update — always reachable */}
      <div className="screen-footer composer-footer">
        <Composer
          placeholder="Add an update…"
          onSubmit={(text) => app.addUpdate(circle.id, text)}
        />
      </div>
    </div>
  );
}
