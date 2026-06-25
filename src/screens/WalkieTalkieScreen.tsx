/* Screen 6 — Walkie-talkie. A focused push-to-talk channel for one Circle:
   hold to talk to everyone on it, see who's live, and scroll the clip history
   (with on-device transcripts). Audio + transcription handled in services/voice.ts. */

import { Radio } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { PushToTalk } from '../components/PushToTalk';
import { ScreenHeader } from '../components/ScreenHeader';
import { VoiceLog } from '../components/VoiceLog';
import { useApp } from '../store/AppContext';

export function WalkieTalkieScreen() {
  const { id = '' } = useParams();
  const app = useApp();
  const circle = app.getCircle(id);
  const [speaking, setSpeaking] = useState(false);

  if (!circle || !app.currentNurse) {
    return (
      <div className="screen">
        <ScreenHeader title="Walkie-talkie" back backTo="/shift" />
        <p className="t-dim empty-line">This Circle is no longer available.</p>
      </div>
    );
  }

  const members = app.membersFor(circle);
  const clips = app.voiceFor(circle.id);
  const online = members.filter((n) => n.online);

  return (
    <div className="screen">
      <ScreenHeader title="Walkie-talkie" subtitle={`${circle.patient.name} · Room ${circle.patient.room}`} back backTo={`/circle/${circle.id}`} />

      <div className="walkie-body">
        <section className="card card-pad walkie-channel">
          <div className="row gap-2">
            <Radio size={16} className={speaking ? 't-cyan' : 't-dim'} />
            <span className="card-h grow">Channel · {online.length} on the floor</span>
          </div>
          <div className="team-row">
            {members.map((n) => (
              <div key={n.id} className="team-member">
                <Avatar nurse={n} size={40} showPresence />
                <span className="team-name">{n.id === app.currentNurse!.id ? 'You' : n.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>

          <div className="walkie-stage">
            <PushToTalk
              circleId={circle.id}
              currentNurse={app.currentNurse}
              onActiveChange={setSpeaking}
              onSend={(clip) => void app.sendVoiceMessage(circle.id, clip.durationSec, clip.transcript, clip.audioUrl)}
            />
          </div>
        </section>

        <section className="card card-pad">
          <div className="section-title">Recent clips</div>
          <VoiceLog messages={clips} getNurse={app.getNurse} currentNurseId={app.currentNurse.id} />
        </section>
      </div>
    </div>
  );
}
