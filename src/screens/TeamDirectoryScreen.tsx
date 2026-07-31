/* Team directory — every nurse on the unit, with their role, status, presence,
   and 4-digit ID code. Searchable by name, role, or code so teammates can find
   each other fast. */

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { ScreenHeader } from '../components/ScreenHeader';
import { useApp } from '../store/AppContext';

export function TeamDirectoryScreen() {
  const { nurses, currentNurse } = useApp();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const sorted = [...nurses].sort(
      (a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
    );
    if (!query) return sorted;
    return sorted.filter(
      (n) =>
        n.name.toLowerCase().includes(query) ||
        n.code.includes(query) ||
        n.role.toLowerCase().includes(query),
    );
  }, [nurses, q]);

  const unit = currentNurse?.unit ?? '';

  return (
    <div className="screen">
      <ScreenHeader title="Team" subtitle={unit} back backTo="/profile" />

      <div className="directory-body">
        <div className="input-icon">
          <Search size={18} className="t-dim" />
          <input
            className="input has-icon"
            placeholder="Search by name, role, or ID code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            inputMode="search"
            aria-label="Search the team"
          />
        </div>

        <div className="section-title">
          {filtered.length} {filtered.length === 1 ? 'nurse' : 'nurses'}
        </div>

        {filtered.length === 0 ? (
          <p className="t-faint empty-line">No one matches “{q}”.</p>
        ) : (
          <ul className="directory-list card">
            {filtered.map((n) => (
              <li key={n.id} className="directory-row">
                <Avatar nurse={n} size={46} showPresence />
                <div className="stack grow directory-info">
                  <div className="row gap-2">
                    <span className="directory-name">{n.name}</span>
                    {n.id === currentNurse?.id && <span className="chip chip-cyan">You</span>}
                  </div>
                  <span className="t-dim directory-role">{n.role}</span>
                  {n.statusNote && <span className="t-faint directory-status">{n.statusNote}</span>}
                </div>
                <div className="stack directory-id">
                  <span className="id-badge">ID {n.code}</span>
                  <span className={`directory-presence ${n.online ? 'is-online' : ''}`}>
                    {n.online ? 'Online' : 'Off shift'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
