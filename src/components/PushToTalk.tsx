/* Press-and-hold walkie-talkie. The audio transport is stubbed (services/voice.ts);
   this builds the full interaction: hold to transmit, live timer, who's-speaking
   state, release to send. Works with touch, mouse, and keyboard (Space/Enter). */

import { Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { stopwatch } from '../lib/format';
import { beginTransmission, endTransmission } from '../services/voice';
import type { Nurse } from '../types/models';

export interface VoiceClip {
  durationSec: number;
  transcript: string | null;
  audioUrl: string | null;
}

interface PushToTalkProps {
  circleId: string;
  currentNurse: Nurse;
  onSend: (clip: VoiceClip) => void;
  /** Notified when transmission starts/stops, so the channel can show speaking state. */
  onActiveChange?: (active: boolean) => void;
}

export function PushToTalk({ circleId, currentNurse, onSend, onActiveChange }: PushToTalkProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const activeRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const start = async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setRecording(true);
    setElapsed(0);
    onActiveChange?.(true);
    await beginTransmission({ circleId, senderId: currentNurse.id });
    timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const stop = async () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setRecording(false);
    onActiveChange?.(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const clip = await endTransmission();
    onSend(clip);
    setElapsed(0);
  };

  // Stop the timer if the component unmounts mid-transmission.
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  return (
    <div className="ptt">
      <div className={`ptt-status ${recording ? 'is-on' : ''}`}>
        {recording ? (
          <>
            <span className="ptt-eq" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            You’re speaking · {stopwatch(elapsed)}
          </>
        ) : (
          'Hold to talk to everyone in this Circle'
        )}
      </div>

      <button
        className={`ptt-btn ${recording ? 'is-recording' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          void start();
        }}
        onPointerUp={() => void stop()}
        onPointerLeave={() => void stop()}
        onPointerCancel={() => void stop()}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            void start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            void stop();
          }
        }}
        aria-label="Hold to talk"
      >
        {recording && <span className="ptt-ring" aria-hidden="true" />}
        <Mic size={32} strokeWidth={2.2} />
      </button>
    </div>
  );
}
