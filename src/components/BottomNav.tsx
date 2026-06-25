/* Native-feeling bottom tab bar. The center action keeps "create a Circle"
   reachable in one tap from anywhere in the app. */

import { BarChart3, CalendarClock, Plus } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

export function BottomNav() {
  const navigate = useNavigate();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink
        to="/shift"
        className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
      >
        <CalendarClock size={22} />
        <span>Shift</span>
      </NavLink>

      <button
        className="nav-create"
        onClick={() => navigate('/create')}
        aria-label="Create a new Circle"
      >
        <Plus size={26} strokeWidth={2.6} />
      </button>

      <NavLink
        to="/insights"
        className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
      >
        <BarChart3 size={22} />
        <span>Insights</span>
      </NavLink>
    </nav>
  );
}
