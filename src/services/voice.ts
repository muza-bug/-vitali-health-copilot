/* =============================================================================
   Vitali Health AI — Voice transport (walkie-talkie audio)
   -----------------------------------------------------------------------------
   Real on-device capture: MediaRecorder records the clip, the Web Speech API
   transcribes it live — both run entirely in the browser, no key required. When
   a capability is missing (e.g. Safari speech, or denied mic), it degrades to a
   believable mock so the demo never breaks.

   >>> TODO: stream the captured audio to a realtime voice backend instead of a
       local object URL, and persist via services/api.ts. <<<
   ============================================================================= */

export interface VoiceClip {
  durationSec: number;
  transcript: string | null;
  audioUrl: string | null;
}

/* --------------------------------------------------- Minimal SpeechRecognition typings */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return getSpeechCtor() !== null;
}

/* ------------------------------------------------------------- Live session state */
interface Session {
  startedAt: number;
  recorder: MediaRecorder | null;
  stream: MediaStream | null;
  chunks: Blob[];
  recognition: SpeechRecognitionLike | null;
  transcript: string;
}

let session: Session | null = null;

/** Begin transmitting. Acquires mic + starts transcription where supported. */
export async function beginTransmission(_meta: {
  circleId: string;
  senderId: string;
}): Promise<void> {
  const s: Session = {
    startedAt: Date.now(),
    recorder: null,
    stream: null,
    chunks: [],
    recognition: null,
    transcript: '',
  };

  // Audio capture (optional — may be denied or unsupported).
  try {
    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) s.chunks.push(e.data);
      };
      recorder.start();
      s.stream = stream;
      s.recorder = recorder;
    }
  } catch {
    // No mic / denied — fine, we'll mock the clip on stop.
  }

  // Live speech-to-text (optional).
  const Ctor = getSpeechCtor();
  if (Ctor) {
    try {
      const rec = new Ctor();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        s.transcript = text.trim();
      };
      rec.onerror = () => {};
      rec.start();
      s.recognition = rec;
    } catch {
      /* ignore */
    }
  }

  session = s;
}

/** Stop transmitting and resolve with the finished clip. */
export async function endTransmission(): Promise<VoiceClip> {
  const s = session;
  session = null;
  const durationSec = Math.max(1, Math.round(((s ? Date.now() - s.startedAt : 0) || 0) / 1000));

  if (!s) return { durationSec, transcript: null, audioUrl: null };

  s.recognition?.stop();

  let audioUrl: string | null = null;
  if (s.recorder) {
    audioUrl = await new Promise<string | null>((resolve) => {
      s.recorder!.onstop = () => {
        s.stream?.getTracks().forEach((t) => t.stop());
        if (s.chunks.length === 0) return resolve(null);
        const blob = new Blob(s.chunks, { type: s.recorder!.mimeType || 'audio/webm' });
        resolve(URL.createObjectURL(blob));
      };
      s.recorder!.stop();
    });
  }

  const transcript = s.transcript ? s.transcript : null;
  return { durationSec, transcript, audioUrl };
}

/**
 * Play a clip. With a real audio URL it plays the bytes; without one it
 * "plays" for a beat so the waveform animates, then calls onEnded.
 * Returns a stop() function.
 */
export function playAudio(url: string | null, onEnded: () => void): () => void {
  if (url) {
    const audio = new Audio(url);
    audio.onended = onEnded;
    audio.onerror = onEnded;
    void audio.play().catch(onEnded);
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }
  // No bytes (mock clip) — simulate a short playback.
  const timer = window.setTimeout(onEnded, 1800);
  return () => window.clearTimeout(timer);
}
