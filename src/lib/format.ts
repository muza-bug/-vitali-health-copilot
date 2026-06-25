/* =============================================================================
   Vitali Health AI — Formatting helpers
   Small, pure functions for human-friendly time / duration display.
   ============================================================================= */

/** "just now", "8 min ago", "3h ago", "yesterday", "Mar 4". */
export function timeAgo(iso: string, ref: number = Date.now()): string {
  const diff = ref - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 45) return 'just now';
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** 24-hour clock time, e.g. "14:32". */
export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Compact duration from ms: "47s", "9m", "1h 12m". */
export function duration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

/** Hours:minutes left until an ISO time, e.g. "8h 12m left". */
export function timeLeft(iso: string, ref: number = Date.now()): string {
  const diff = new Date(iso).getTime() - ref;
  if (diff <= 0) return 'ending';
  const totalMin = Math.round(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m left`;
  return `${h}h ${m}m left`;
}

/** mm:ss for a live recording timer. */
export function stopwatch(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
