/* Tiny inline trend chart for the Insights cards. Pure SVG, no deps. Draws a
   smooth line over a faint gradient area, with a dot on the latest point. */

interface SparklineProps {
  series: number[];
  color?: string;
  width?: number;
  height?: number;
}

let gradSeq = 0;

export function Sparkline({
  series,
  color = 'var(--cyan)',
  width = 220,
  height = 44,
}: SparklineProps) {
  if (series.length < 2) return <svg className="sparkline" width={width} height={height} />;

  const gid = `spark-${gradSeq++}`;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pad = 3;
  const stepX = (width - pad * 2) / (series.length - 1);

  const pts = series.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`;
  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.6" fill={color} />
    </svg>
  );
}
