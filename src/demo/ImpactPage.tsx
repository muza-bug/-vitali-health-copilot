/* =============================================================================
   Insights (hospital administrator view) — aggregate, anonymized process
   metrics and the before/after arc that proves the training loop works.
   This is what makes Vitali a business, not just a nurse tool.

   // TODO: real analytics pipeline feeds these rollups (process metrics only —
   //       patient identity never enters this path).
   ============================================================================= */

import { ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { impact } from '../data/demoContent';
import { DemoFooter } from './DemoShell';

/** One small-multiple trend: a single series with a training-rollout marker. */
function Trend({
  name,
  series,
  lowerIsBetter,
  weeks,
  rolloutWeek,
}: {
  name: string;
  series: number[];
  lowerIsBetter: boolean;
  weeks: string[];
  rolloutWeek: number;
}) {
  const W = 480;
  const H = 150;
  const padX = 30;
  const padY = 22;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const x = (i: number) => padX + (i / (series.length - 1)) * (W - padX * 2);
  const y = (v: number) => padY + (1 - (v - min) / (max - min || 1)) * (H - padY * 2);
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const improved = lowerIsBetter
    ? series[series.length - 1] < series[0]
    : series[series.length - 1] > series[0];
  const Arrow = series[series.length - 1] < series[0] ? TrendingDown : TrendingUp;
  const rx = x(rolloutWeek);

  return (
    <div className="card card-pad trend">
      <h4>
        {name}{' '}
        <span style={{ color: improved ? 'var(--ok)' : 'var(--warn)', fontWeight: 700 }}>
          <Arrow size={13} style={{ verticalAlign: -2 }} />
        </span>
      </h4>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name}: ${series[0]} in week 1 to ${series[series.length - 1]} in week 8; training rolled out week 3`}>
        {/* training rollout marker */}
        <line x1={rx} y1={10} x2={rx} y2={H - 16} stroke="rgba(63,217,232,.35)" strokeDasharray="3 4" />
        <text className="rollout-lbl" x={rx + 5} y={16}>training live</text>
        {/* series */}
        <polyline points={pts} fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {series.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === series.length - 1 ? 3.5 : 2} fill="var(--cyan)" />
        ))}
        {/* direct labels: first + last value, week axis ends */}
        <text x={x(0)} y={y(series[0]) - 8} fontSize="11" fill="#8a97ad" textAnchor="middle">{series[0]}</text>
        <text x={x(series.length - 1) - 4} y={y(series[series.length - 1]) - 9} fontSize="12" fontWeight="700" fill={improved ? '#3dd68c' : '#f5a623'} textAnchor="end">
          {series[series.length - 1]}
        </text>
        <text x={x(0)} y={H - 2} fontSize="10" fill="#5b6680" textAnchor="middle">{weeks[0]}</text>
        <text x={x(series.length - 1)} y={H - 2} fontSize="10" fill="#5b6680" textAnchor="middle">{weeks[weeks.length - 1]}</text>
      </svg>
    </div>
  );
}

export function ImpactPage() {
  return (
    <>
      <div className="dp">
        <div className="dp-label">Insights · hospital view</div>
        <h1>The floor, measured — and improving</h1>
        <p className="dp-sub">
          Aggregate process metrics for 4 West — Cardiac, eight weeks around the Vitali training
          rollout. Every number is anonymized and aggregated: timestamps and durations, never
          identities.
        </p>

        {/* headline before/after */}
        <div className="impact-head-grid">
          {impact.headline.map((h) => (
            <div className="card card-pad" key={h.name}>
              <div className="t-dim" style={{ fontSize: 13 }}>{h.name}</div>
              <div className="impact-num">{h.now}</div>
              <div className="impact-was">was {h.was} before training</div>
              <div className="impact-delta">{h.delta}</div>
            </div>
          ))}
        </div>

        {/* the proof: before/after trends */}
        <div style={{ marginTop: 30 }}>
          <div className="dp-label">The loop, visible</div>
          <h2 style={{ fontSize: 20 }}>Watch the curves bend where training goes live</h2>
          <p className="t-dim" style={{ marginTop: 6, maxWidth: '70ch' }}>
            Training launched at the start of week 3 — built from this floor's own reviewed
            sessions, like{' '}
            <Link to="/training/session/c118" className="t-cyan" style={{ fontWeight: 600 }}>
              Room 118
            </Link>
            . As lessons complete, the operational metrics follow.
          </p>
          <div className="trend-grid">
            {impact.trends.map((t) => (
              <Trend key={t.name} {...t} weeks={impact.weeks} rolloutWeek={impact.rolloutWeek} />
            ))}
          </div>
        </div>

        {/* privacy framing — repeated deliberately */}
        <div className="card privacy-land" style={{ marginTop: 26 }}>
          <span className="p-ico"><ShieldCheck size={22} /></span>
          <div>
            <h3>No patient identities in this view — ever</h3>
            <p>
              These rollups are computed from <b>process events only</b>: when a task started, how
              long it took, whether a handoff confirmed flagged items. Patient identity stays inside
              the care Circle and never enters analytics or training. The hospital owns this data,
              and contracts keep it contained.
            </p>
          </div>
        </div>

        {/* what a hospital gets */}
        <div style={{ marginTop: 30 }}>
          <div className="dp-label">What a hospital gets</div>
          <div className="value-grid">
            {impact.value.map((v) => (
              <div className="card" key={v.head}>
                <b>{v.head}</b>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <DemoFooter />
    </>
  );
}
