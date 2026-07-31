/* The Vitali mark: a gradient "V" (electric purple → teal → green, warm orange
   tip in the valley) drawn as vectors so it stays crisp at any size. */

interface LogoProps {
  size?: number;
  /** 'mark' = bare V; 'card' = V inside a rounded app-icon tile. */
  variant?: 'mark' | 'card';
  withWordmark?: boolean;
}

let gradSeq = 0;

export function Logo({ size = 40, variant = 'mark', withWordmark = false }: LogoProps) {
  // Unique gradient id so multiple logos on one screen don't collide.
  const gid = `vitali-v-${gradSeq++}`;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6B3FE0" />
          <stop offset="0.5" stopColor="#2BB8C4" />
          <stop offset="0.82" stopColor="#3DD68C" />
          <stop offset="1" stopColor="#F5A623" />
        </linearGradient>
      </defs>
      <path
        d="M11 12.5 L24 35.5 L37 12.5"
        stroke={`url(#${gid})`}
        strokeWidth="6.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const markEl =
    variant === 'card' ? (
      <span className="logo-card" style={{ width: size, height: size }}>
        <span className="logo-card-inner">
          <svg
            width={size * 0.62}
            height={size * 0.62}
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id={gid}
                x1="6"
                y1="8"
                x2="42"
                y2="40"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#6B3FE0" />
                <stop offset="0.5" stopColor="#2BB8C4" />
                <stop offset="0.82" stopColor="#3DD68C" />
                <stop offset="1" stopColor="#F5A623" />
              </linearGradient>
            </defs>
            <path
              d="M11 12.5 L24 35.5 L37 12.5"
              stroke={`url(#${gid})`}
              strokeWidth="6.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    ) : (
      mark
    );

  if (!withWordmark) return markEl;

  return (
    <span className="logo-lockup">
      {markEl}
      <span className="logo-word">
        Vitali<span className="logo-word-dim"> Health AI</span>
      </span>
    </span>
  );
}
