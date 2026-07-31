/* Profile / Settings. Nurse identity + 4-digit ID code, an editable status the
   team can see, avatar customization, presence, a link to the team directory,
   and a live view of which backend integrations are wired. */

import {
  Activity,
  AlertTriangle,
  Building2,
  Camera,
  ChevronRight,
  Coins,
  LogOut,
  Mic,
  RadioTower,
  Slack,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { PrivacyNote } from '../components/PrivacyNote';
import { ScreenHeader } from '../components/ScreenHeader';
import { fileToAvatarDataUrl } from '../lib/image';
import {
  alertsEnabled,
  getSlackWebhook,
  postSlack,
  setAlertsEnabled,
  setSlackWebhook,
  slackConfigured,
} from '../services/connectors';
import {
  getAiHealth,
  getTokenTotals,
  isAiConnected,
  subscribeAiHealth,
  type AiHealth,
} from '../services/llm';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';

type ConnState = 'checking' | 'on' | 'off';

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
  const { currentNurse, shift, live, setLive, setPresence, setStatusNote, setPhoto } = useApp();
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [ai, setAi] = useState<ConnState>('checking');
  const [aiHealth, setAiHealth] = useState<AiHealth>(getAiHealth());
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Connectors (Slack) — device-local settings.
  const [slackUrl, setSlackUrl] = useState(getSlackWebhook());
  const [alerts, setAlerts] = useState(alertsEnabled());
  const [slackTest, setSlackTest] = useState<'idle' | 'sending' | 'ok' | 'fail'>('idle');

  const tokens = getTokenTotals();

  useEffect(() => {
    isAiConnected().then((c) => setAi(c ? 'on' : 'off'));
    return subscribeAiHealth(setAiHealth);
  }, []);

  if (!currentNurse) return null;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoErr(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await setPhoto(dataUrl);
    } catch {
      setPhotoErr('Could not read that image — try another photo.');
    }
  };

  const saveSlack = (url: string) => {
    setSlackUrl(url);
    setSlackWebhook(url);
    setSlackTest('idle');
  };

  const testSlack = async () => {
    setSlackTest('sending');
    const ok = await postSlack(
      `:wave: Vitali connected — reports and alerts from ${currentNurse.unit} will post here.`,
    );
    setSlackTest(ok ? 'ok' : 'fail');
  };

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  return (
    <div className="screen">
      <ScreenHeader title="Profile" />

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

        {/* Profile photo */}
        <section className="card card-pad">
          <div className="row gap-2 customize-head">
            <Camera size={16} className="t-cyan" />
            <span className="card-h">Profile photo</span>
          </div>
          <div className="row gap-3 photo-row">
            <Avatar nurse={currentNurse} size={54} />
            <div className="stack grow">
              <span className="t-dim">
                {currentNurse.photoUrl
                  ? 'Your photo is what teammates see across the app.'
                  : 'Add a photo so teammates recognize you at a glance.'}
              </span>
              {photoErr && <span className="t-warn-line">{photoErr}</span>}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void pickPhoto(e.target.files?.[0]);
              e.target.value = ''; // allow re-picking the same file
            }}
          />
          <div className="row gap-2 photo-actions">
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              <Camera size={16} /> {currentNurse.photoUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {currentNurse.photoUrl && (
              <button className="btn btn-secondary" onClick={() => void setPhoto(null)}>
                <Trash2 size={16} /> Remove
              </button>
            )}
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

        {/* Team connectors — where the Data agent posts */}
        <section className="card card-pad">
          <div className="row gap-2 customize-head">
            <Slack size={16} className="t-cyan" />
            <span className="card-h">Slack connector</span>
          </div>
          <p className="t-faint connector-hint">
            Paste a Slack incoming-webhook URL and the Data agent can post unit reports and
            critical alerts to your team channel.
          </p>
          <input
            className="input"
            value={slackUrl}
            placeholder="https://hooks.slack.com/services/…"
            onChange={(e) => saveSlack(e.target.value)}
            aria-label="Slack webhook URL"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <div className="row between connector-foot">
            <div className="row gap-2">
              <span className="t-dim">Auto-alert on critical changes</span>
              <button
                className={`switch ${alerts ? 'is-on' : ''}`}
                role="switch"
                aria-checked={alerts}
                aria-label="Toggle Slack alerts"
                onClick={() => {
                  setAlerts(!alerts);
                  setAlertsEnabled(!alerts);
                }}
              >
                <span className="switch-knob" />
              </button>
            </div>
            <button
              className="link-btn"
              onClick={() => void testSlack()}
              disabled={!slackConfigured() || slackTest === 'sending'}
            >
              {slackTest === 'sending'
                ? 'Sending…'
                : slackTest === 'ok'
                  ? 'Sent ✓'
                  : slackTest === 'fail'
                    ? 'Failed — retry'
                    : 'Send test'}
            </button>
          </div>
        </section>

        {/* AI usage — tokens spent against the Claude Console balance */}
        <section className="card card-pad">
          <div className="row gap-2 customize-head">
            <Coins size={16} className="t-cyan" />
            <span className="card-h">AI usage</span>
          </div>
          {aiHealth.creditsExhausted && (
            <div className="credits-banner">
              <AlertTriangle size={16} />
              <span>
                <b>Out of Claude credits.</b> The AI has switched to on-device fallbacks. Buy more
                in the Claude Console dashboard (console.anthropic.com → Billing) and it will pick
                back up automatically.
              </span>
            </div>
          )}
          <div className="usage-grid">
            <div className="stack usage-cell">
              <span className="usage-num">{tokens.calls.toLocaleString()}</span>
              <span className="t-faint">AI calls</span>
            </div>
            <div className="stack usage-cell">
              <span className="usage-num">{tokens.inputTokens.toLocaleString()}</span>
              <span className="t-faint">Input tokens</span>
            </div>
            <div className="stack usage-cell">
              <span className="usage-num">{tokens.outputTokens.toLocaleString()}</span>
              <span className="t-faint">Output tokens</span>
            </div>
          </div>
          <p className="t-faint usage-note">
            Counted from this device. The AI uses your Claude credit balance from the Console
            dashboard; when it runs out you’ll see a notice here and in the assistant.
          </p>
        </section>

        {/* Integrations — the seams, made visible */}
        <section className="card card-pad">
          <div className="section-title">Connections</div>
          <ConnRow
            icon={<Sparkles size={17} />}
            label="AI assistant & agents"
            detail="Claude, Ollama, or AnythingLLM (pluggable)"
            state={ai}
          />
          <div className="divider conn-div" />
          <ConnRow
            icon={<Slack size={17} />}
            label="Slack"
            detail="Unit reports & critical alerts to your channel"
            state={slackConfigured() ? 'on' : 'off'}
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
