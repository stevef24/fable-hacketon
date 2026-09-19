// OWNER: P5 (vivi09032000). Everything on screen during a run.
import { useEffect, useState } from 'react';
import { GATES, formatTime } from '../game/contract';
import { useGameStore } from '../game/store';
import { isMuted, subscribeMute, toggleMute } from './audio';
import './ui.css';

/** P5 (vivi09032000). Persisted across runs by audio.ts. */
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
      {muted ? '\u{1F507}' : '\u{1F50A}'}
    </button>
  );
}

export default function HUD() {
  const phase = useGameStore((s) => s.phase);
  const elapsed = useGameStore((s) => s.elapsed);
  const speed = useGameStore((s) => s.displaySpeed);
  const gatesReached = useGameStore((s) => s.gatesReached);
  const flash = useGameStore((s) => s.flash);
  const [visibleFlash, setVisibleFlash] = useState(flash);

  useEffect(() => {
    if (!flash) return;
    setVisibleFlash(flash);
    const id = setTimeout(() => setVisibleFlash(null), 1600);
    return () => clearTimeout(id);
  }, [flash]);

  if (phase !== 'running') return null;

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="timer-chip">
          <span className="timer-icon">⏱</span>
          <span className="timer">{formatTime(elapsed)}</span>
        </div>

        <div className="progress">
          <span className="progress-label">Start</span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(gatesReached / GATES.length) * 100}%` }}
            />
            {GATES.map((g, i) => (
              <div
                key={g.id}
                className={`pip ${i < gatesReached ? 'done' : ''}`}
                style={{ left: `${((i + 1) / GATES.length) * 100}%` }}
                title={g.name}
              />
            ))}
          </div>
          <span className="progress-label">🏁</span>
        </div>
      </div>

      <div className="speed-chip">
        <span className="speed-num">{speed.toFixed(1)}</span> m/s
      </div>

      <MuteButton />

      {visibleFlash && (
        <div className={`flash ${visibleFlash.good ? 'good' : 'bad'}`} key={visibleFlash.at}>
          {visibleFlash.label}
        </div>
      )}
    </div>
  );
}
