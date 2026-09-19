// OWNER: P5 (vivi09032000). Start + finish screens.
// Reads only the zustand store. Audio is initialised from the Start click so
// the browser autoplay policy does not block it.
import { useEffect } from 'react';
import { useGameStore } from '../game/store';
import { init as initAudio, startMusic, stopMusic } from './audio';
import { MuteButton } from './HUD';
import { formatTime } from './format';
import './ui.css';

export default function Screens() {
  const phase = useGameStore((s) => s.phase);
  const lastMs = useGameStore((s) => s.lastMs);
  const bestMs = useGameStore((s) => s.bestMs);
  const isRecord = useGameStore((s) => s.isRecord);
  const start = useGameStore((s) => s.start);
  const reset = useGameStore((s) => s.reset);

  // Music follows the run. init() has already resumed the context on click.
  useEffect(() => {
    if (phase === 'running') startMusic();
    else stopMusic();
  }, [phase]);

  if (phase === 'running') return null;

  const handleStart = () => {
    initAudio(); // user gesture — unlocks Web Audio
    start();
  };

  if (phase === 'menu') {
    return (
      <div className="cmd-screen">
        <MuteButton />
        <div className="cmd-panel">
          <p className="cmd-panel__kicker">Chiang Mai · Time Trial</p>
          <h1 className="cmd-panel__title">Chiang Mai Dash</h1>
          <p className="cmd-panel__instructions">
            <kbd>A</kbd> / <kbd>D</kbd> to steer — run the old city, avoid the locals,
            let the dog chase you.
          </p>
          <button className="cmd-btn" onClick={handleStart}>
            Start
          </button>
        </div>
      </div>
    );
  }

  // finished
  return (
    <div className="cmd-screen">
      <MuteButton />
      <div className="cmd-panel">
        <p className="cmd-panel__kicker">{isRecord ? 'New personal best' : 'Lap complete'}</p>
        <h1 className="cmd-panel__title">Finished!</h1>

        <div className="cmd-stats">
          <div className="cmd-stat cmd-stat--headline">
            <span className="cmd-stat__label">Your time</span>
            <span className="cmd-stat__value">{formatTime(lastMs)}</span>
          </div>
          <div className="cmd-stat">
            <span className="cmd-stat__label">{isRecord ? 'Best (new!)' : 'Best'}</span>
            <span className="cmd-stat__value">{bestMs != null ? formatTime(bestMs) : '—'}</span>
          </div>
        </div>

        {isRecord && <span className="cmd-record">★ New record!</span>}

        <button className="cmd-btn" onClick={reset}>
          Run again
        </button>
      </div>
    </div>
  );
}
