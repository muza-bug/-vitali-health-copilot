/* Profile / Settings. Nurse identity + 4-digit ID code, an editable status the
   team can see, avatar customization, presence, a link to the team directory,
   and a live view of which backend integrations are wired. */

import {
  Activity,
  Building2,
  ChevronRight,
  LogOut,
  Mic,
  Palette,
  RadioTower,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { PrivacyNote } from '../components/PrivacyNote';
import { ScreenHeader } from '../components/ScreenHeader';
import { isAiConnected } from '../services/llm';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';

type ConnState = 'checking' | 'on' | 'off';

/** Avatar tint options the nurse can pick from. */
const HUES = [188, 212, 266, 322, 150, 95, 32, 0];
const swatch = (h: number) =>
  `linear-gradient(140deg, hsl(${h} 68% 56%), hsl(${h + 38} 64% 44%))`;

function ConnRow({
  icon,
  label,
  detail,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  state: ConnState;
}) {
  const text = state === 'checking' ? 'Checking…' : state === 'on' ? 'Connected' : 'Mock';
  return (
    <div className="conn-row">
      <span className="conn-icon">{icon}</span>
      <div className="stack grow">
        <span className="conn-label">{label}</span>
        <span className="t-faint conn-detail">{detail}</span>
      </div>
      <span className={`chip ${state === 'on' ? 'chip-ok' : ''}`}>{text}</span>
    </div>
  );
}

export function ProfileScreen() {
  const { currentNurse, shift, live, setLive, setPresence, setStatusNote, setAvatarHue } = useApp();
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [ai, setAi] = useState<ConnState>('checking');

  useEffect(() => {
    isAiConnected().then((c) => setAi(c ? 'on' : 'off'));
  }, []);

  if (!currentNurse) return null;

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  return (
    <div className="screen">
      <ScreenHeader title="Profile" back backTo="/shift" />

      <div className="profile-body">
        {/* Identity + ID code */}
        <section className="card card-pad profile-id">
          <Avatar nurse={currentNurse} size={68} showPresence />
          <div className="stack grow profile-id-text">
            <h2 className="profile-name">{currentNurse.name}</h2>
            <span className="t-dim">{currentNurse.role}</span>
            <span className="t-faint">{currentNurse.unit}</span>
          </div>
          <div className="stack profile-code">
            <span className="profile-code-label">ID</span>
            <span className="profile-code-num">{currentNurse.code}</span>
          </div>
        </section>

        {/* Editable status the team sees */}
        <section className="card card-pad">
          <div className="section-title">Your status</div>
          <input
            className="input"
            value={currentNurse.statusNote ?? ''}
            placeholder="What you're working on (your team sees this)…"
            maxLength={60}
            onChange={(e) => setStatusNote(e.target.value)}
            aria-label="Status note"
          />
        </section>

        {/* Avatar customization */}
        <section className="card card-pad">
          <div className="row gap-2 customize-head">
            <Palette size={16} className="t-cyan" />
            <span className="card-h">Avatar color</span>
          </div>
          <div className="hue-row">
            {HUES.map((h) => (
              <button
                key={h}
                className={`hue-swatch ${currentNurse.avatarHue === h ? 'is-active' : ''}`}
                style={{ background: swatch(h) }}
                onClick={() => setAvatarHue(h)}
                aria-label={`Set avatar color ${h}`}
              />
            ))}
          </div>
        </section>

        {/* Availability */}
        <section className="card card-pad">
          <div className="row between">
            <div className="stack">
              <span className="card-h">Availability</span>
              <span className="t-faint">
                {currentNurse.online ? 'Available to your team' : 'Shown as away'}
              </span>
            </div>
            <button
              className={`switch ${currentNurse.online ? 'is-on' : ''}`}
              role="switch"
              aria-checked={currentNurse.online}
              aria-label="Toggle availability"
              onClick={() => setPresence(!currentNurse.online)}
            >
              <span className="switch-knob" />
            </button>
          </div>
          {shift && (
            <p className="t-faint profile-shift">
              {shift.label} · {shift.unit} · {session?.hospital}
            </p>
          )}
        </section>

        {/* Live monitoring */}
        <section className="card card-pad">
          <div className="row between">
            <div className="stack">
              <span className="card-h">Live monitoring</span>
              <span className="t-faint">
                {live ? 'Vitals stream live into active Circles' : 'Paused — vitals are static'}
              </span>
            </div>
            <button
              className={`switch ${live ? 'is-on' : ''}`}
              role="switch"
              aria-checked={live}
              aria-label="Toggle live monitoring"
              onClick={() => setLive(!live)}
            >
              <span className="switch-knob" />
            </button>
          </div>
        </section>

        {/* Team directory */}
        <button className="card card-pad nav-card" onClick={() => navigate('/team')}>
          <span className="conn-icon">
            <Users size={17} />
          </span>
          <div className="stack grow nav-card-text">
            <span className="conn-label">Team directory</span>
            <span className="t-faint">Find teammates by name or ID code</span>
          </div>
          <ChevronRight size={18} className="t-faint" />
        </button>

        {/* Integrations — the seams, made visible */}
        <section className="card card-pad">
          <div className="section-title">Connections</div>
          <ConnRow
            icon={<Sparkles size={17} />}
            label="AI assistant & briefings"
            detail="Claude, Ollama, or AnythingLLM (pluggable)"
            state={ai}
          />
          <div className="divider conn-div" />
          <ConnRow
            icon={<Activity size={17} />}
            label="Live monitoring stream"
            detail="Bedside vitals into active Circles"
            state={live ? 'on' : 'off'}
          />
          <div className="divider conn-div" />
          <ConnRow
            icon={<Mic size={17} />}
            label="Voice transcription"
            detail={speechSupported ? 'On-device speech-to-text' : 'Not supported on this browser'}
            state={speechSupported ? 'on' : 'off'}
          />
          <div className="divider conn-div" />
          <ConnRow
            icon={<RadioTower size={17} />}
            label="Real-time sync"
            detail="Live updates across open windows"
            state={typeof BroadcastChannel !== 'undefined' ? 'on' : 'off'}
          />
          <div className="divider conn-div" />
          <ConnRow
            icon={<Building2 size={17} />}
            label="Hospital records (EHR)"
            detail="Pull patient context from the chart"
            state="off"
          />
        </section>

        <PrivacyNote>
          AI runs server-side; patient identity never leaves your team’s Circle for analytics.
        </PrivacyNote>

        <button
          className="btn btn-secondary btn-block signout"
          onClick={() => {
            signOut();
            navigate('/login', { replace: true });
          }}
        >
          <LogOut size={18} /> Sign out
        </button>

        <p className="profile-version t-faint">Vitali Health AI · Prototype v0.1</p>
      </div>
    </div>
  );
}
