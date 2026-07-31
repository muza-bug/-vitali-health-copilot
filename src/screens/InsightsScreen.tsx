/* Screen 7 — Insights. The Data agent's real-time unit report up top (organizes
   what every nurse is logging into one prioritized briefing, shareable to
   Slack), then anonymized aggregated process metrics. The copy makes the
   privacy separation explicit — patient identity and process data never mix. */

import {
  AlertTriangle,
  Bot,
  Eye,
  RefreshCw,
  ShieldCheck,
  Slack,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Sparkline } from '../components/Sparkline';
import { duration } from '../lib/format';
import { taskCategoryMeta } from '../lib/meta';
import { generateUnitReport, reportToSlackText } from '../services/agents';
import { api } from '../services/api';
import { postSlack, slackConfigured } from '../services/connectors';
import { getAiHealth, subscribeAiHealth, type UnitReport } from '../services/llm';
import { useApp } from '../store/AppContext';
import type { AggregateInsight, ProcessMetric, TaskCategory } from '../types/models';

function InsightCard({ insight }: { insight: AggregateInsight }) {
  const improved = insight.lowerIsBetter ? insight.deltaPct < 0 : insight.deltaPct > 0;
  const Arrow = insight.deltaPct < 0 ? TrendingDown : TrendingUp;
  return (
    <div className="insight-card card card-pad">
      <span className="insight-label">{insight.label}</span>
      <span className="insight-value">{insight.value}</span>
      <Sparkline series={insight.series} color={improved ? 'var(--ok)' : 'var(--cyan)'} />
      <div className="insight-row">
        <span className={`insight-delta ${improved ? 'is-good' : 'is-bad'}`}>
          <Arrow size={14} strokeWidth={2.6} />
          {Math.abs(insight.deltaPct)}%
        </span>
        <span className="t-faint insight-n">{insight.sampleSize} samples</span>
      </div>
      <p className="insight-caption t-dim">{insight.caption}</p>
    </div>
  );
}

/** The Data agent's live unit report card. */
function UnitReportCard() {
  const { shift, circles, tasks, timeline, nurses } = useApp();
  const [report, setReport] = useState<UnitReport | null>(null);
  const [running, setRunning] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'sending' | 'ok' | 'fail'>('idle');
  const [credits, setCredits] = useState(getAiHealth().creditsExhausted);

  useEffect(() => subscribeAiHealth((h) => setCredits(h.creditsExhausted)), []);

  const unit = shift?.unit ?? 'This unit';

  const run = async () => {
    if (running) return;
    setRunning(true);
    setShareState('idle');
    const r = await generateUnitReport(unit, circles, tasks, timeline, nurses);
    setReport(r);
    setRunning(false);
  };

  // First report generates itself when the screen opens.
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    if (!report) return;
    setShareState('sending');
    const ok = await postSlack(reportToSlackText(report, unit));
    setShareState(ok ? 'ok' : 'fail');
  };

  const Section = ({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) =>
    lines.length === 0 ? null : (
      <div className="report-section">
        <span className="report-section-title">{icon} {title}</span>
        <ul className="report-list">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    );

  return (
    <section className="card card-pad report-card">
      <div className="row between">
        <div className="row gap-2">
          <Bot size={16} className="t-cyan" />
          <span className="card-h">Data agent · live unit report</span>
        </div>
        <button className="link-btn" onClick={() => void run()} disabled={running} aria-label="Refresh report">
          <RefreshCw size={14} className={running ? 'spin' : ''} /> {running ? 'Reporting…' : 'Refresh'}
        </button>
      </div>

      {credits && (
        <div className="credits-banner">
          <AlertTriangle size={15} />
          <span>
            Out of Claude credits — reports fall back to on-device math. Top up in the Claude
            Console dashboard.
          </span>
        </div>
      )}

      {!report ? (
        <p className="t-faint empty-line">Reading the unit…</p>
      ) : (
        <>
          <p className="report-headline">{report.headline}</p>
          <Section icon={<AlertTriangle size={13} />} title="Needs attention" lines={report.attention} />
          <Section icon={<Eye size={13} />} title="Watch" lines={report.watch} />
          <Section icon={<Users size={13} />} title="Workload" lines={report.workload} />
          <div className="row between report-foot">
            <span className="t-faint">
              {report.source === 'ai' ? 'Vitali Data agent' : 'On-device summary'} ·{' '}
              {new Date(report.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              className="link-btn"
              onClick={() => void share()}
              disabled={!slackConfigured() || shareState === 'sending'}
              title={slackConfigured() ? 'Post this report to Slack' : 'Connect Slack in Profile first'}
            >
              <Slack size={14} />{' '}
              {shareState === 'sending'
                ? 'Sending…'
                : shareState === 'ok'
                  ? 'Sent ✓'
                  : shareState === 'fail'
                    ? 'Failed — retry'
                    : 'Send to Slack'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function InsightsScreen() {
  const [insights, setInsights] = useState<AggregateInsight[] | null>(null);
  const [metrics, setMetrics] = useState<ProcessMetric[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getInsights(), api.getProcessMetrics()]).then(([ins, met]) => {
      if (!alive) return;
      setInsights(ins);
      setMetrics(met);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Average task-completion time per category (de-identified) for the mini chart.
  const byCategory = useMemo(() => {
    const groups = new Map<TaskCategory, number[]>();
    for (const m of metrics) {
      if (m.type !== 'task_completion' || m.category === 'general') continue;
      const arr = groups.get(m.category as TaskCategory) ?? [];
      arr.push(m.durationMs);
      groups.set(m.category as TaskCategory, arr);
    }
    const rows = [...groups.entries()].map(([cat, arr]) => ({
      cat,
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    }));
    const max = Math.max(1, ...rows.map((r) => r.avg));
    return rows.sort((a, b) => b.avg - a.avg).map((r) => ({ ...r, pct: r.avg / max }));
  }, [metrics]);

  return (
    <div className="screen insights animate-fade">
      <header className="home-top">
        <h1 className="home-greeting">Insights</h1>
        <p className="t-dim home-date">Anonymized process metrics for 4 West</p>
      </header>

      {/* The Data agent's live briefing */}
      <UnitReportCard />

      {/* Privacy is the product */}
      <section className="card card-pad privacy-banner">
        <span className="privacy-banner-icon">
          <ShieldCheck size={20} />
        </span>
        <div className="stack">
          <span className="privacy-banner-title">Anonymized &amp; aggregated</span>
          <span className="t-dim">
            These numbers carry <b>no patient identity</b> and no individual nurse — only how long
            things take. Identity and process data are kept completely separate.
          </span>
        </div>
      </section>

      {insights === null ? (
        <p className="t-faint empty-line">Loading insights…</p>
      ) : (
        <>
          <div className="insight-grid">
            {insights.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>

          {byCategory.length > 0 && (
            <section className="card card-pad">
              <div className="section-title">Average task time by type</div>
              <ul className="bar-chart">
                {byCategory.map((r) => {
                  const { Icon, label } = taskCategoryMeta[r.cat];
                  return (
                    <li key={r.cat} className="bar-row">
                      <span className="bar-label">
                        <Icon size={13} /> {label}
                      </span>
                      <span className="bar-track">
                        <span className="bar-fill" style={{ width: `${Math.round(r.pct * 100)}%` }} />
                      </span>
                      <span className="bar-val t-dim">{duration(r.avg)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {/* The long-term story */}
      <section className="card card-pad how-it-works">
        <div className="row gap-2">
          <Sparkles size={16} className="t-cyan" />
          <span className="card-h">How this becomes training insight</span>
        </div>
        <p className="t-dim">
          Vitali quietly measures process — how long handoffs and tasks take — as de-identified
          durations. Aggregated across many shifts, one nurse’s experience helps train the whole
          team, without a single patient’s identity ever leaving their care Circle.
        </p>
      </section>
    </div>
  );
}
