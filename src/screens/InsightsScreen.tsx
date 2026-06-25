/* Screen 7 — Insights. A light teaser of the long-term value: anonymized,
   aggregated process metrics. The copy makes the privacy separation explicit —
   patient identity and process data never mix. Pipeline is stubbed (analytics.ts). */

import { ShieldCheck, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Sparkline } from '../components/Sparkline';
import { duration } from '../lib/format';
import { taskCategoryMeta } from '../lib/meta';
import { api } from '../services/api';
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
