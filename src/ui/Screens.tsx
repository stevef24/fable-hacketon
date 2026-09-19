// OWNER: P5 (vivi09032000). Title and results screens.
import { GATES, formatSplit, formatTime, rankFor } from '../game/contract';
import { useGameStore } from '../game/store';
import { init as initAudio, startMusic, stopMusic } from './audio';

/** Audio must be unlocked by a user gesture, so it starts from the button. */
function beginRun(start: () => void) {
  initAudio();
  startMusic();
  start();
}

function Title() {
  const start = useGameStore((s) => s.start);
  const bestMs = useGameStore((s) => s.bestMs);

  return (
    <div className="screen title-screen">
      <div className="panel how-it-works">
        <h2>How it works</h2>
        <ol>
          <li>Run 1 lap around the Chiang Mai moat</li>
          <li>Reach all 4 gates</li>
          <li>Finish back at Tha Phae Gate</li>
          <li>Beat your best time</li>
        </ol>
        <h3>Obstacles</h3>
        <ul className="legend">
          <li><span className="dot bike" /> Motorbikes — crash, back to last gate</li>
          <li><span className="dot dog" /> Soi dogs — speed boost</li>
          <li><span className="dot massage" /> Massage ladies — slow you down</li>
          <li><span className="dot food" /> Food carts — you stop to eat</li>
          <li><span className="dot splash" /> Wet zones — Songkran soaking</li>
        </ul>
      </div>

      <div className="centre-stack">
        <img className="logo-art" src="/brand/logo.png" alt="Moat Runner — Chiang Mai" />
        <p className="tagline">Run the Chiang Mai Moat</p>
        <button className="btn btn-go" onClick={() => beginRun(start)}>
          ▶ Start Run
        </button>
        <p className="hint">A / D or ← / → to steer</p>
        {bestMs !== null && (
          <div className="best-chip">👑 Best Time: {formatTime(bestMs)}</div>
        )}
      </div>
    </div>
  );
}

function Results() {
  const { lastMs, bestMs, isRecord, splits, stats, reset, start } = useGameStore();
  const rank = rankFor(lastMs);

  return (
    <div className="screen results-screen">
      <img className="logo-art small" src="/brand/logo.png" alt="Moat Runner" />
      <p className="run-complete">Run Complete!</p>

      <div className="final-time-box">
        <span className="final-label">⏱ Final Time</span>
        <span className="final-time">{formatTime(lastMs)}</span>
      </div>

      <div className="rank-ribbon">
        <strong>{rank.title}</strong>
        <span>{rank.blurb}</span>
      </div>

      <div className="panels">
        <div className="panel">
          <h2>📊 Run Stats</h2>
          <dl>
            <div><dt>🏍 Motorbike hits</dt><dd>{stats.motorbikeHits}</dd></div>
            <div><dt>🐕 Soi dog boosts</dt><dd>{stats.dogBoosts}</dd></div>
            <div><dt>💆 Massage delays</dt><dd>{stats.massageDelays}</dd></div>
            <div><dt>💧 Wet zones hit</dt><dd>{stats.wetZones}</dd></div>
            <div><dt>🥭 Sticky rice stops</dt><dd>{stats.snacks}</dd></div>
            <div><dt>🏁 Gates reached</dt><dd>{splits.length} / {GATES.length}</dd></div>
            <div><dt>💨 Best speed burst</dt><dd>{(stats.bestBurstMs / 1000).toFixed(1)}s</dd></div>
          </dl>
        </div>

        <div className="panel">
          <h2>🕐 Split Times</h2>
          <dl>
            {splits.map((s, i) => (
              <div key={s.name}>
                <dt><span className="split-num">{i + 1}</span> {s.name}</dt>
                <dd>{formatSplit(s.ms)}</dd>
              </div>
            ))}
          </dl>
          <div className="total-row">
            <span>👑 Total time</span>
            <strong>{formatTime(lastMs)}</strong>
          </div>
          <div className="prev-row">
            <span>Previous best</span>
            <span>{isRecord || bestMs === null ? '--:--.--' : formatTime(bestMs)}</span>
          </div>
          {isRecord && <div className="record">🎉 New record!</div>}
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-again" onClick={() => beginRun(start)}>↻ Run Again</button>
        <button className="btn btn-menu" onClick={() => { stopMusic(); reset(); }}>Menu</button>
      </div>
    </div>
  );
}

export default function Screens() {
  const phase = useGameStore((s) => s.phase);
  if (phase === 'menu') return <Title />;
  if (phase === 'finished') return <Results />;
  return null;
}
