// OWNER: P5 (vivi09032000). Timer, speed, effect caption, mute toggle.
// Reads only the zustand store — never runner, never the game loop.
import { useEffect, useRef, useState } from 'react';
import type { ObstacleKind } from '../game/contract';
import { useGameStore } from '../game/store';
import { isMuted, subscribeEffect, subscribeMute, toggleMute } from './audio';
import { formatTime } from './format';
import './ui.css';

type Tone = 'good' | 'bad' | 'cool';
const CAPTIONS: Record<ObstacleKind, { text: string; tone: Tone }> = {
  motorbike: { text: 'Motorbike!', tone: 'bad' },
  massage: { text: 'Massage stop', tone: 'bad' },
  food: { text: 'Khao soi break', tone: 'bad' },
  dog: { text: 'Soi dog chase!', tone: 'good' },
  splash: { text: 'Songkran splash!', tone: 'cool' },
};

export function MuteButton() {
  const [muted, setMuted] = useState(isMuted);
  useEffect(() => subscribeMute(setMuted), []);
  return (
    <button
      className="cmd-mute"
      aria-label={muted ? 'Unmute' : 'Mute'}
      aria-pressed={muted}
      title={muted ? 'Unmute' : 'Mute'}
      onClick={() => toggleMute()}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

interface Caption {
  id: number;
  text: string;
  tone: Tone;
}

export default function HUD() {
  const phase = useGameStore((s) => s.phase);
  const elapsed = useGameStore((s) => s.elapsed);
  const speed = useGameStore((s) => s.displaySpeed);

  const [caption, setCaption] = useState<Caption | null>(null);
  const nextId = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return subscribeEffect((kind) => {
      const c = CAPTIONS[kind];
      setCaption({ id: nextId.current++, text: c.text, tone: c.tone });
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setCaption(null), 1000);
    });
  }, []);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  if (phase !== 'running') return null;

  return (
    <div className="cmd-hud">
      <div className="cmd-hud__timer" aria-live="off">
        {formatTime(elapsed)}
      </div>
      <div className="cmd-hud__speed">
        {Math.round(speed)}
        <span>m/s</span>
      </div>
      {caption && (
        <div key={caption.id} className={`cmd-caption cmd-caption--${caption.tone}`}>
          {caption.text}
        </div>
      )}
      <MuteButton />
    </div>
  );
}
