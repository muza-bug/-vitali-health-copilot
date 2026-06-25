/* Screen 5 — Handoff. Everything the next nurse needs to take over, in one
   glance: full patient context, an AI-written briefing grounded only in this
   Circle's data, and the open tasks to pick up. The handoff time is the metric
   the long-term product learns from. */

import { Copy, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PatientContext } from '../components/PatientContext';
import { PrivacyNote } from '../components/PrivacyNote';
import { ScreenHeader } from '../components/ScreenHeader';
import { taskCategoryMeta } from '../lib/meta';
import { aiHandoff, type AiSource } from '../services/llm';
import { useApp } from '../store/AppContext';

export function HandoffScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const app = useApp();
  const circle = app.getCircle(id);

  const [text, setText] = useState('');
  const [source, setSource] = useState<AiSource>('mock');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const reqId = useRef(0);

  const entries = circle ? app.timelineFor(circle.id) : [];
  const recentNotes = entries.filter((e) => e.kind === 'note').slice(-6).map((e) => e.text);
  const openTasks = circle ? app.tasksFor(circle.id).filter((t) => t.status === 'open') : [];

  const generate = useCallback(async () => {
    if (!circle) return;
    const rid = ++reqId.current;
    setLoading(true);
    const res = await aiHandoff(circle, recentNotes, openTasks.map((t) => t.label));
    if (rid !== reqId.current) return;
    setText(res.text);
    setSource(res.source);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circle?.id, circle?.status, recentNotes.length, openTasks.length]);

  useEffect(() => {
    void generate();
  }, [generate]);

  if (!circle || !app.currentNurse) {
    return (
      <div className="screen">
        <ScreenHeader title="Handoff" back backTo="/shift" />
        <p className="t-dim empty-line">This Circle is no longer available.</p>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="screen">
      <ScreenHeader title="Handoff" subtitle={circle.patient.name} back backTo={`/circle/${circle.id}`} />

      <div className="handoff-body">
        <PatientContext circle={circle} />

        {/* AI briefing */}
        <section className="card card-pad assistant">
          <div className="row between">
            <div className="row gap-2">
              <Sparkles size={16} className="t-cyan" />
              <span className="card-h">Handoff briefing</span>
            </div>
            <button className="link-btn" onClick={() => void generate()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Regenerate
            </button>
          </div>

          {loading && !text ? (
            <p className="t-faint empty-line"><Loader2 size={14} className="spin" /> Writing the briefing…</p>
          ) : (
            <p className="handoff-text">{text}</p>
          )}

          <div className="row between handoff-actions">
            <span className="assistant-foot t-faint">
              {source === 'ai' ? 'Written by Vitali AI from this Circle' : 'On-device draft · connect a model for richer briefings'}
            </span>
            <button className="btn btn-secondary handoff-copy" onClick={() => void copy()} disabled={!text}>
              <Copy size={15} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

        {/* Open tasks to pick up */}
        <section className="card card-pad">
          <div className="section-title">Open tasks to pick up · {openTasks.length}</div>
          {openTasks.length === 0 ? (
            <p className="t-faint empty-line">Nothing open — all caught up.</p>
          ) : (
            <ul className="handoff-tasks">
              {openTasks.map((t) => {
                const { Icon, label } = taskCategoryMeta[t.category];
                return (
                  <li key={t.id} className="handoff-task">
                    <Icon size={14} className="t-dim" />
                    <span className="grow">{t.label}</span>
                    <span className="chip">{label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <PrivacyNote>This briefing is generated server-side and stays within your team's Circle.</PrivacyNote>
      </div>

      <div className="screen-footer">
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            void app.changeStatus(circle.id, 'handoff');
            navigate(`/circle/${circle.id}`);
          }}
        >
          Mark as handed off
        </button>
      </div>
    </div>
  );
}
