/* Screen 3 — Create a Circle. The first nurse builds the shared workspace: pull
   the patient straight from the chart (EHR seam) or type the essentials, set a
   status, and invite the team. Setup time is captured as a de-identified metric.
   Designed to take well under a minute. */

import { Building2, Check, Loader2, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { ScreenHeader } from '../components/ScreenHeader';
import { statusMeta, STATUS_OPTIONS, toneChip } from '../lib/meta';
import { EHR_DEMO_ROOMS, fetchPatientRecord } from '../services/ehr';
import { useApp, type CreateCircleInput } from '../store/AppContext';
import type { CircleStatus, PatientFlag, Vitals } from '../types/models';

/** Context the EHR can fill in beyond the free-text basics. */
interface PulledContext {
  age: number;
  sex: 'F' | 'M' | 'X';
  mrn: string;
  vitals: Vitals;
  flags: PatientFlag[];
}

export function CreateCircleScreen() {
  const { nurses, currentNurse, createCircle } = useApp();
  const navigate = useNavigate();
  const startedAt = useRef(Date.now());

  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [allergies, setAllergies] = useState('');
  const [status, setStatus] = useState<CircleStatus>('monitoring');
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [pulled, setPulled] = useState<PulledContext | null>(null);

  const [query, setQuery] = useState('');
  const [pulling, setPulling] = useState(false);
  const [pullErr, setPullErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const others = nurses.filter((n) => n.id !== currentNurse?.id);
  const canSave = name.trim() && room.trim() && reason.trim() && !saving;

  const pull = async () => {
    if (!query.trim() || pulling) return;
    setPulling(true);
    setPullErr(null);
    const chart = await fetchPatientRecord(query);
    setPulling(false);
    if (!chart) {
      setPullErr(`No chart found for “${query}”. Try a demo room.`);
      return;
    }
    setName(chart.name);
    setRoom(chart.room);
    setReason(chart.reason);
    setNotes(chart.notes);
    setAllergies(chart.allergies.join(', '));
    setStatus(chart.suggestedStatus);
    setPulled({ age: chart.age, sex: chart.sex, mrn: chart.mrn, vitals: chart.vitals, flags: chart.flags });
  };

  // Editing identity by hand invalidates the chart-pulled context.
  const onName = (v: string) => { setName(v); setPulled(null); };
  const onRoom = (v: string) => { setRoom(v); setPulled(null); };

  const toggleMember = (id: string) =>
    setMembers((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const input: CreateCircleInput = {
      patientName: name.trim(),
      room: room.trim(),
      reason: reason.trim(),
      notes: notes.trim(),
      status,
      allergies: allergies.split(',').map((a) => a.trim()).filter(Boolean),
      memberIds: [...members],
      setupMs: Date.now() - startedAt.current,
      ...(pulled ?? {}),
    };
    const id = await createCircle(input);
    navigate(`/circle/${id}`, { replace: true });
  };

  return (
    <div className="screen">
      <ScreenHeader title="New Circle" back backTo="/shift" />

      <div className="create-body">
        {/* Pull from chart */}
        <section className="card card-pad">
          <div className="row gap-2 customize-head">
            <Building2 size={16} className="t-cyan" />
            <span className="card-h">Pull from chart</span>
          </div>
          <div className="input-icon">
            <Search size={17} className="t-dim" />
            <input
              className="input has-icon"
              placeholder="Room or MRN…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void pull()}
              inputMode="search"
            />
            <button className="inline-btn" onClick={() => void pull()} disabled={pulling || !query.trim()}>
              {pulling ? <Loader2 size={16} className="spin" /> : 'Pull'}
            </button>
          </div>
          <div className="ehr-hints">
            <span className="t-faint">Demo rooms:</span>
            {EHR_DEMO_ROOMS.map((r) => (
              <button key={r} className="ehr-hint" onClick={() => { setQuery(r); }}>
                {r}
              </button>
            ))}
          </div>
          {pullErr && <p className="t-warn-line">{pullErr}</p>}
          {pulled && (
            <p className="pulled-ok"><Check size={13} /> Chart loaded · MRN {pulled.mrn} · {pulled.age}{pulled.sex}</p>
          )}
        </section>

        {/* Basics */}
        <section className="card card-pad create-form">
          <div className="field">
            <label className="label" htmlFor="pname">Patient name</label>
            <input id="pname" className="input" value={name} placeholder="Full name" onChange={(e) => onName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="proom">Room</label>
            <input id="proom" className="input" value={room} placeholder="e.g. 412" onChange={(e) => onRoom(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="preason">Reason for admission</label>
            <input id="preason" className="input" value={reason} placeholder="One line — why are they here?" onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Status</label>
            <div className="status-select">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`status-opt ${status === s ? `is-active ${toneChip[statusMeta[s].tone]}` : ''}`}
                  onClick={() => setStatus(s)}
                >
                  {statusMeta[s].label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="pallerg">Allergies</label>
            <input id="pallerg" className="input" value={allergies} placeholder="Comma-separated, e.g. Penicillin, Latex" onChange={(e) => setAllergies(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pnotes">Key context</label>
            <textarea id="pnotes" className="textarea" value={notes} placeholder="The picture the next nurse needs before walking in." onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>

        {/* Invite team */}
        <section className="card card-pad">
          <div className="section-title">Invite team · {members.size} selected</div>
          <div className="member-grid">
            {others.map((n) => {
              const on = members.has(n.id);
              return (
                <button key={n.id} className={`member-chip ${on ? 'is-on' : ''}`} onClick={() => toggleMember(n.id)}>
                  <Avatar nurse={n} size={30} showPresence />
                  <span className="stack member-chip-text grow">
                    <span className="member-name truncate">{n.name}</span>
                    <span className="t-faint member-role truncate">{n.role}</span>
                  </span>
                  <span className={`member-tick ${on ? 'is-on' : ''}`}>{on && <Check size={13} strokeWidth={3} />}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="screen-footer">
        <button className="btn btn-primary btn-block" onClick={() => void save()} disabled={!canSave}>
          {saving ? <Loader2 size={18} className="spin" /> : null}
          {saving ? 'Creating…' : 'Create Circle'}
        </button>
      </div>
    </div>
  );
}
