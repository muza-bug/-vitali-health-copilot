/* =============================================================================
   Session Review — the most important screen in the demo. A recorded Circle
   becomes a training module: player with AI annotation markers, Vita's
   timestamped commentary, what happened / what could have been better, metrics
   vs benchmarks, and the team's discussion.

   // TODO: real AI generates annotations, summaries, and improvement notes from
   //       session audio + logged events (ASR → event alignment → benchmark
   //       comparison → coaching generation). This page renders those outputs.
   ============================================================================= */

import {
  AlertTriangle,
  ArrowUpRight,
  Eye,
  ListChecks,
  Play,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  trainingSessions,
  type ReviewMetric,
  type ReviewComment,
} from '../data/demoContent';
import { DemoFooter } from './DemoShell';

const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtHM = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

/** Demo playback advances 4× real time so reviewers see the arc quickly. */
const RATE = 4;

function MetricCard({ m, onSeek }: { m: ReviewMetric; onSeek: (t: number) => void }) {
  const v = (x: number) => (m.fmt === 'hm' ? fmtHM(x) : `${x}${m.unit ? (m.unit === '%' ? '' : ' ') + m.unit : ''}`);
  const worse = m.higherBetter ? m.session < m.bench : m.session > m.bench;
  const sign = m.session > m.bench ? '+' : '−';
  const delta =
    m.session === m.bench
      ? 'on target'
      : m.fmt === 'hm'
        ? `${sign}${fmtHM(Math.abs(m.session - m.bench))} vs best`
        : `${sign}${Math.abs(m.session - m.bench)}${m.unit} vs best`;
  return (
    <div className={`sr-metric ${m.hit ? 'hit' : ''}`}>
      <div className="m-name">{m.name}</div>
      <div className="m-val">
        {v(m.session)} <small>/ best practice {v(m.bench)}</small>
      </div>
      <div className="sr-bar session" role="img" aria-label={`This session: ${v(m.session)}`}>
        <i style={{ width: `${Math.min(100, (m.session / m.max) * 100)}%` }} />
      </div>
      <div className="sr-bar bench" role="img" aria-label={`Best practice: ${v(m.bench)}`}>
        <i style={{ width: `${Math.min(100, (m.bench / m.max) * 100)}%` }} />
      </div>
      <span className={`sr-delta ${m.hit || !worse ? 'good' : 'bad'}`}>{m.hit ? '✔ ' : ''}{delta}</span>
      {m.note && (
        <div className="sr-mnote">
          Driven by late staging —{' '}
          <button onClick={() => m.noteT != null && onSeek(m.noteT)}>
            <b>see {fmtT(m.noteT ?? 0)}</b>
          </button>
        </div>
      )}
    </div>
  );
}

export function SessionReview() {
  const { cid = 'c214' } = useParams();
  const navigate = useNavigate();
  const S = trainingSessions[cid] ?? trainingSessions.c214;

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const notesRef = useRef<HTMLDivElement>(null);
  const reduced = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Comments live in memory only — reset on refresh, by design (no storage).
  const [extra, setExtra] = useState<ReviewComment[]>([]);
  const [draft, setDraft] = useState('');

  // Stable decorative waveform per session.
  const wave = useMemo(() => {
    let seed = S.duration;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 64 }, () => 8 + Math.round(rnd() * 88));
  }, [S.duration]);

  // Reset player when switching sessions.
  useEffect(() => {
    setT(0);
    setPlaying(false);
    setExtra([]);
    setDraft('');
  }, [cid]);

  // Fake playback clock. // TODO: real media element drives this instead.
  useEffect(() => {
    if (!playing) return;
    const h = window.setInterval(() => {
      setT((cur) => {
        const next = cur + RATE * 0.25;
        if (next >= S.duration) {
          setPlaying(false);
          return S.duration;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(h);
  }, [playing, S.duration]);

  const active = useMemo(() => {
    let idx = -1;
    S.annotations.forEach((a, i) => {
      if (t >= a.t) idx = i;
    });
    return idx;
  }, [t, S.annotations]);

  // Keep the active note in view while playing.
  useEffect(() => {
    if (!playing || active < 0) return;
    const el = notesRef.current?.querySelectorAll('.vnote')[active];
    el?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [active, playing, reduced]);

  const seekTo = (sec: number, pause = true) => {
    if (pause) setPlaying(false);
    setT(Math.max(0, Math.min(S.duration, sec)));
  };

  const post = () => {
    const text = draft.trim();
    if (!text) return;
    setExtra((x) => [...x, { who: 'Maria', role: 'RN', ava: 'MS', likes: 0, mine: true, text }]);
    setDraft('');
    // TODO: real backend — comments sync to the team feed here.
  };

  const comments = [...S.comments, ...extra];
  const isExemplar = cid === 'c118';

  return (
    <>
      <div className="dp">
        <p className="t-faint" style={{ fontSize: 13, marginBottom: 10 }}>
          <Link to="/training" className="t-cyan" style={{ fontWeight: 600 }}>Training</Link>
          {' › '}Session review
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1>{S.title}</h1>
            <p className="dp-sub">{S.sub}</p>
          </div>
          <span className="chip chip-cyan">{S.chip}</span>
        </div>

        <div className="sr-wrap">
          {/* player + analysis column */}
          <div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="sr-screen">
                {/* TODO: real session video/audio renders here (placeholder panel) */}
                <span className="sr-room">{S.room}</span>
                <span className="sr-rec">● REC REVIEW</span>
                <div className="sr-wave" aria-hidden="true">
                  {wave.map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <button
                  className="sr-play"
                  onClick={() => {
                    if (!playing && t >= S.duration) setT(0);
                    setPlaying((p) => !p);
                  }}
                  aria-label={playing ? 'Pause recording' : 'Play recording'}
                >
                  {playing ? '❚❚' : <Play size={24} fill="currentColor" />}
                </button>
              </div>
              <div className="sr-deck">
                <div className="sr-deck-top">
                  <span className="sr-now">
                    Now playing · <b>{fmtT(t)}</b>
                    {active >= 0 && <span className="t-faint"> · {S.annotations[active].head}</span>}
                  </span>
                  <span className="sr-dur">{fmtT(S.duration)}</span>
                </div>
                <div className="sr-track">
                  <input
                    type="range"
                    className="sr-seek"
                    min={0}
                    max={S.duration}
                    step={1}
                    value={t}
                    style={{ '--pct': `${(t / S.duration) * 100}%` } as React.CSSProperties}
                    onChange={(e) => seekTo(+e.target.value, false)}
                    aria-label="Seek recording"
                  />
                  {S.annotations.map((a, i) => (
                    <button
                      key={a.t}
                      className={`sr-marker ${a.kind} ${i === active ? 'is-on' : ''}`}
                      style={{ left: `${(a.t / S.duration) * 100}%` }}
                      title={`${fmtT(a.t)} — ${a.head}`}
                      aria-label={`${a.kind === 'good' ? 'Strong moment' : 'Coaching moment'} at ${fmtT(a.t)}: ${a.head}`}
                      onClick={() => seekTo(a.t)}
                    />
                  ))}
                </div>
                <div className="sr-mleg" aria-hidden="true">
                  <span><i style={{ background: 'var(--ok)' }} />Strong moment</span>
                  <span><i style={{ background: 'var(--warn)' }} />Could be smoother</span>
                </div>
              </div>
            </div>

            {/* summary + improvements */}
            <div className="dp-grid2" style={{ marginTop: 18 }}>
              <div className="card card-pad">
                <div className="dp-label">What happened</div>
                <p className="t-dim" style={{ lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: S.summary }} />
              </div>
              <div className="card card-pad" style={isExemplar ? { borderColor: 'var(--ok-line)' } : { borderColor: 'var(--warn-line)' }}>
                <h3 style={{ fontSize: 16 }}>{S.improveTitle}</h3>
                <p className="t-faint" style={{ fontSize: 12.5, margin: '4px 0 14px' }}>{S.improveHint}</p>
                {S.improvements.map((p) => (
                  <div className={`imp ${isExemplar ? 'exemplar' : ''}`} key={p.head}>
                    <div className="imp-head">
                      <span className="imp-cat">{p.cat}</span>
                      <span className="imp-t">at {p.t}</span>
                    </div>
                    <b className="imp-title">{p.head}</b>
                    <p dangerouslySetInnerHTML={{ __html: p.text }} />
                  </div>
                ))}
              </div>
            </div>

            {/* metrics vs benchmark */}
            <div className="card card-pad" style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div className="dp-label" style={{ margin: 0 }}>This session vs best practice</div>
                <div className="sr-metrics-legend" aria-hidden="true">
                  <span><i style={{ background: isExemplar ? 'var(--ok)' : 'var(--warn)' }} />This session</span>
                  <span><i style={{ background: 'var(--cyan)' }} />Best practice</span>
                </div>
              </div>
              <div className="sr-mgrid">
                {S.metrics.map((m) => (
                  <MetricCard key={m.name} m={m} onSeek={(sec) => seekTo(sec)} />
                ))}
              </div>
            </div>

            {/* loop back into the live app — same Circle */}
            <button className="loop-link" style={{ marginTop: 18 }} onClick={() => navigate(`/circle/${S.circleId}`)}>
              <ArrowUpRight size={18} className="t-cyan" />
              <span style={{ flex: 1 }}>
                <b>This review came from a real Circle — open it in the live app</b>
                <span>Same room, same timeline, same team. The loop is one system.</span>
              </span>
            </button>

            {/* comments */}
            <div className="card card-pad" style={{ marginTop: 18 }}>
              <div className="dp-label">Team discussion · {comments.length} comments</div>
              {comments.map((c, i) => (
                <div className="sr-comment" key={`${c.who}-${i}`}>
                  <span className={`sr-cava ${c.mine ? 'mine' : ''}`} aria-hidden="true">{c.ava}</span>
                  <div>
                    <div className="who">
                      {c.who}
                      <span>· {c.role}</span>
                      {c.mine && <span className="t-cyan">· you</span>}
                    </div>
                    <p>{c.text}</p>
                    <div className="likes">♥ {c.likes} · Reply</div>
                  </div>
                </div>
              ))}
              <div className="sr-composer">
                <span className="sr-cava mine" aria-hidden="true">MS</span>
                <textarea
                  value={draft}
                  placeholder="Share what you'd do differently, or what you're taking from this…"
                  aria-label="Write a comment"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      post();
                    }
                  }}
                />
                <button className="btn btn-primary" onClick={post}>Post</button>
              </div>
            </div>
          </div>

          {/* Vita commentary column */}
          <div className="card vita-col">
            <div className="vita-head">
              <span className="vita-orb" aria-hidden="true" />
              <div>
                <b>Vita · session review</b>
                <br />
                <span>Timestamped coaching, moment by moment</span>
              </div>
              <RefreshCw size={14} className="t-faint" style={{ marginLeft: 'auto' }} />
            </div>
            <div className="vita-notes" ref={notesRef}>
              {S.annotations.map((a, i) => (
                <button
                  key={a.t}
                  className={`vnote ${a.kind} ${i === active ? 'is-on' : ''}`}
                  onClick={() => seekTo(a.t)}
                >
                  <span className="vnote-time">{fmtT(a.t)}</span>
                  <span>
                    <span className="vnote-k">
                      {a.kind === 'good' ? '✔ Strong moment' : '⚑ Could be smoother'}
                    </span>
                    <p dangerouslySetInnerHTML={{ __html: a.text }} />
                  </span>
                </button>
              ))}
              <p className="t-faint" style={{ fontSize: 11.5, padding: '10px 12px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span><Eye size={11} /> Grounded in this session only</span>
                <span><Users size={11} /> Coaching, never scoring</span>
                <span><ListChecks size={11} /> <AlertTriangle size={11} style={{ display: 'none' }} />Tied to captured metrics</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <DemoFooter />
    </>
  );
}
