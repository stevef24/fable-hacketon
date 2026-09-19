// OWNER: P5 (issue #12). In-run HUD, styled to docs/reference/11-hud-widget-kit.png.
// Reads the store only -- never `runner`, never the game loop.
import { useEffect, useState } from 'react';
import { GATES, START_GATE, formatTime } from '../game/contract';
import { useGameStore } from '../game/store';
import { isMuted, subscribeMute, toggleMute } from './audio';
import './ui.css';

export function MuteButton() {
  const [muted, setMuted] = useState(isMuted);
  useEffect(() => subscribeMute(setMuted), []);
  return (
    <button
      className="icon-btn"
      aria-label={muted ? 'Unmute' : 'Mute'}
      aria-pressed={muted}
      onClick={() => toggleMute()}
    >
      {muted ? '\u{1F507}' : '\u{1F50A}'}
    </button>
  );
}

/** Parchment stat plate: icon, count, label. */
function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="plate stat">
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function HUD() {
  const phase = useGameStore((s) => s.phase);
  const elapsed = useGameStore((s) => s.elapsed);
  const speed = useGameStore((s) => s.displaySpeed);
  const gatesReached = useGameStore((s) => s.gatesReached);
  const splits = useGameStore((s) => s.splits);
  const stats = useGameStore((s) => s.stats);
  const flash = useGameStore((s) => s.flash);
  const heldMs = useGameStore((s) => s.heldMs);
  const heldBy = useGameStore((s) => s.heldBy);

  const [popup, setPopup] = useState(flash);
  useEffect(() => {
    if (!flash) return;
    setPopup(flash);
    const id = setTimeout(() => setPopup(null), 1800);
    return () => clearTimeout(id);
  }, [flash]);

  if (phase !== 'running') return null;

  const lastGate = splits.length ? splits[splits.length - 1].name : START_GATE;

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-row">
          <div className="chip timer-chip">
            <span className="chip-icon">&#9201;</span>
            <span className="timer">{formatTime(elapsed)}</span>
          </div>

          <div className="plate checkpoint">
            <span className="cp-icon">&#127983;</span>
            <span className="cp-text">
              <strong>{lastGate}</strong>
              <em>Last checkpoint</em>
            </span>
          </div>
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
          <span className="progress-label">&#127937;</span>
        </div>
      </div>

      <div className="hud-stats">
        <Stat icon="&#128131;" value={stats.massageDelays} label="Massage" />
        <Stat icon="&#128021;" value={stats.dogBoosts} label="Soi dogs" />
        <Stat icon="&#127949;" value={stats.motorbikeHits} label="Motorbikes" />
        <Stat icon="&#128167;" value={stats.wetZones} label="Wet zones" />
      </div>

      <div className="chip speed-chip">
        <span className="speed-num">{speed.toFixed(1)}</span>
        <span className="speed-unit">m/s</span>
      </div>

      <MuteButton />

      {heldMs > 0 && (
        <div className="held">
          <div className="held-bubble">{heldBy}</div>
          <div className="held-count">{(heldMs / 1000).toFixed(1)}s</div>
          <div className="held-bar">
            <div className="held-bar-fill" style={{ width: `${Math.min(100, heldMs / 50)}%` }} />
          </div>
        </div>
      )}

      {popup && (
        <div className={`popup ${popup.good ? 'good' : 'bad'}`} key={popup.at}>
          {popup.label}
        </div>
      )}
    </div>
  );
}
