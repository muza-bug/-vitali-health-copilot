/* Profile-photo avatar. Falls back to gradient initials when no photo is set.
   Optional presence dot. */

import type { Nurse } from '../types/models';

interface AvatarProps {
  nurse: Nurse;
  size?: number;
  showPresence?: boolean;
}

export function Avatar({ nurse, size = 38, showPresence = false }: AvatarProps) {
  const { avatarHue: h, photoUrl } = nurse;
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: photoUrl
          ? 'var(--surface-3)'
          : `linear-gradient(140deg, hsl(${h} 68% 56%), hsl(${h + 38} 64% 44%))`,
      }}
      title={nurse.name}
    >
      {photoUrl ? (
        <img className="avatar-photo" src={photoUrl} alt={nurse.name} />
      ) : (
        nurse.initials
      )}
      {showPresence && (
        <span
          className={`avatar-presence ${nurse.online ? 'is-online' : ''}`}
          aria-label={nurse.online ? 'online' : 'offline'}
        />
      )}
    </span>
  );
}

/** Overlapping stack of member avatars with a "+N" overflow. */
export function AvatarStack({
  nurses,
  max = 4,
  size = 30,
}: {
  nurses: Nurse[];
  max?: number;
  size?: number;
}) {
  const shown = nurses.slice(0, max);
  const extra = nurses.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map((n) => (
        <span key={n.id} className="avatar-stack-item" style={{ marginLeft: -size * 0.32 }}>
          <Avatar nurse={n} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="avatar-extra"
          style={{ width: size, height: size, fontSize: size * 0.34, marginLeft: -size * 0.32 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
