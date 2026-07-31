/* Screen 2 — My Shift. The nurse's home base: who they are, time left on shift,
   a quick pulse of the unit, and the list of patient Circles (critical first).
   Tapping a card opens the full Circle. */

import { Activity, ChevronRight, Settings2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { CircleCard } from '../components/CircleCard';
import { timeLeft } from '../lib/format';
import { useApp } from '../store/AppContext';

function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const { currentNurse, shift, circles, membersFor, tasksFor } = useApp();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const critical = circles.filter((c) => c.status === 'critical').length;
    const openTasks = circles.reduce(
      (sum, c) => sum + tasksFor(c.id).filter((t) => t.status === 'open').length,
      0,
    );
    return { circles: circles.length, critical, openTasks };
  }, [circles, tasksFor]);

  if (!currentNurse) return null;

  return (
    <div className="screen-tab home animate-fade">
      <header className="home-top">
        <div className="row between gap-3">
          <div className="stack">
            <span className="eyebrow">{greeting()}</span>
            <h1 className="home-greeting">{currentNurse.name.split(' ')[0]}</h1>
            <p className="t-dim home-date">
              {shift ? `${shift.label} · ${shift.unit} · ${timeLeft(shift.endsAt)}` : currentNurse.unit}
            </p>
          </div>
          <button className="home-avatar" onClick={() => navigate('/profile')} aria-label="Profile">
            <Avatar nurse={currentNurse} size={46} showPresence />
          </button>
        </div>
      </header>

      {/* Unit pulse */}
      <section className="stat-strip card">
        <button className="stat" onClick={() => navigate('/insights')}>
          <span className="stat-num num">{stats.circles}</span>
          <span className="stat-label t-faint">Circles</span>
        </button>
        <span className="stat-div" />
        <div className="stat">
          <span className={`stat-num num ${stats.critical ? 't-danger-strong' : ''}`}>{stats.critical}</span>
          <span className="stat-label t-faint">Critical</span>
        </div>
        <span className="stat-div" />
        <div className="stat">
          <span className="stat-num num">{stats.openTasks}</span>
          <span className="stat-label t-faint">Open tasks</span>
        </div>
      </section>

      <div className="row between home-list-head">
        <div className="section-title" style={{ margin: 0 }}>
          <Activity size={13} /> Your Circles
        </div>
        <button className="link-btn" onClick={() => navigate('/create')}>
          New <ChevronRight size={14} />
        </button>
      </div>

      {circles.length === 0 ? (
        <div className="card card-pad empty-state">
          <Settings2 size={22} className="t-faint" />
          <p className="t-dim">No Circles yet. Create one to share a patient with your team.</p>
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            Create a Circle
          </button>
        </div>
      ) : (
        <div className="circle-list">
          {circles.map((c) => (
            <CircleCard
              key={c.id}
              circle={c}
              members={membersFor(c)}
              openTasks={tasksFor(c.id).filter((t) => t.status === 'open').length}
              onOpen={() => navigate(`/circle/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
