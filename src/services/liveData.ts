/* =============================================================================
   Vitali Health AI — Live data collection (bedside monitor stream)
   -----------------------------------------------------------------------------
   Simulates the continuous vitals feed a real deployment would receive from
   bedside monitors / wearables. The store runs this on a tick to make active
   Circles genuinely live: numbers move, trends recompute, and notable shifts
   land on the timeline. Efficient by design — the store only ticks while the
   tab is visible and only for Circles that warrant monitoring.

   >>> TODO: replace driftVitals() with a real device/HL7/FHIR Observation feed
       (WebSocket). The store integration stays the same. <<<
   ============================================================================= */

import type { Vitals, VitalTrend } from '../types/models';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const jitter = (range: number) => (Math.random() * 2 - 1) * range;

function trend(delta: number, eps: number): VitalTrend {
  if (delta > eps) return 'up';
  if (delta < -eps) return 'down';
  return 'steady';
}

/** Advance vitals one realistic step (a small bounded random walk). */
export function driftVitals(v: Vitals): Vitals {
  const hr = Math.round(clamp(v.hr + jitter(3), 38, 150));
  const spo2 = Math.round(clamp(v.spo2 + jitter(1), 80, 100));
  const temp = Math.round(clamp(v.temp + jitter(0.15), 34.5, 41) * 10) / 10;
  const resp = Math.round(clamp(v.resp + jitter(1), 8, 36));

  const [sys, dia] = v.bp.split('/').map((n) => parseInt(n, 10) || 0);
  const nsys = Math.round(clamp(sys + jitter(4), 80, 200));
  const ndia = Math.round(clamp(dia + jitter(3), 45, 120));

  return {
    ...v,
    hr,
    spo2,
    temp,
    resp,
    bp: `${nsys}/${ndia}`,
    takenAt: new Date().toISOString(),
    trends: {
      hr: trend(hr - v.hr, 1),
      bp: trend(nsys - sys, 2),
      spo2: trend(spo2 - v.spo2, 0),
      temp: trend(temp - v.temp, 0.05),
    },
  };
}

/** Returns a short timeline-worthy note when vitals cross a clinical line. */
export function notableChange(prev: Vitals, next: Vitals): string | null {
  if (prev.spo2 >= 92 && next.spo2 < 92) return `SpO₂ dropped to ${next.spo2}% — below target`;
  if (prev.hr <= 120 && next.hr > 120) return `HR climbed to ${next.hr} bpm`;
  if (prev.temp < 38 && next.temp >= 38) return `Temp rose to ${next.temp}°C — febrile`;
  const nsys = parseInt(next.bp, 10);
  const psys = parseInt(prev.bp, 10);
  if (psys >= 90 && nsys < 90) return `BP fell to ${next.bp} — hypotensive`;
  return null;
}
