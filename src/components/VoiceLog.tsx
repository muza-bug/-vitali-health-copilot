/* Recent walkie-talkie clips. Plays back real captured audio when available
   (services/voice.ts); clips with no on-device transcript show the speech-to-text
   seam hint. */

import { Pause, Play, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { timeAgo } from '../lib/format';
import { playAudio } from '../services/voice';
import type { Nurse, VoiceMessage } from '../types/models';
import { Avatar } from './Avatar';

/** Deterministic pseudo-waveform so each clip looks distinct but stable. */
function bars(id: string, n = 22): number[] {
  let seed = 0;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  return Array.from({ length: n }, (_, i) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return 0.25 + ((seed >> (i % 7)) % 100) / 130;
  });
}

interface VoiceLogProps {
  messages: VoiceMessage[];
  getNurse: (id: string) => Nurse | undefined;
  currentNurseId: string;
}

export function VoiceLog({ messages, getNurse, currentNurseId }: VoiceLogProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // Stop any in-flight playback if this list unmounts.
  useEffect(() => () => stopRef.current?.(), []);

  if (messages.length === 0) {
    return <p className="t-faint empty-line">No voice messages yet.</p>;
  }

  const toggle = (m: VoiceMessage) => {
    stopRef.current?.();
    stopRef.current = null;
    if (playingId === m.id) {
      setPlayingId(null);
      return;
    }
    setPlayingId(m.id);
    stopRef.current = playAudio(m.audioUrl, () => {
      setPlayingId((cur) => (cur === m.id ? null : cur));
      stopRef.current = null;
    });
  };

  return (
    <ul className="voice-log">
      {messages.map((m) => {
        const sender = getNurse(m.senderId);
        const isMe = m.senderId === currentNurseId;
        const playing = playingId === m.id;
        return (
          <li key={m.id} className="voice-item">
            {sender && <Avatar nurse={sender} size={34} />}
            <div className="voice-main grow">
              <div className="voice-head">
                <span className="tl-author">{isMe ? 'You' : sender?.name ?? 'Teammate'}</span>
                <span className="t-faint">{timeAgo(m.createdAt)}</span>
              </div>
              <div className="voice-player">
                <button
                  className="voice-play"
                  onClick={() => toggle(m)}
                  aria-label={playing ? 'Pause' : 'Play voice message'}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <span className={`waveform ${playing ? 'is-playing' : ''}`}>
                  {bars(m.id).map((h, i) => (
                    <span key={i} style={{ height: `${Math.round(h * 100)}%` }} />
                  ))}
                </span>
                <span className="voice-dur t-faint">{m.durationSec}s</span>
              </div>
              {m.transcript ? (
                <p className="voice-transcript">“{m.transcript}”</p>
              ) : (
                <p className="voice-pending">
                  <Sparkles size={12} /> Transcript pending — connect speech-to-text
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
