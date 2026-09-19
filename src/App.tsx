// OWNER: P1 (Stav). Scene assembly, first-person camera, phase routing.
// The ground plane and start overlay below are PLACEHOLDERS: they belong to
// P4 (world) and P5 (ui) and should be deleted when those land.
import { Canvas, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { TRACK_LENGTH } from './game/contract';
import { runner } from './game/runner';
import { useGameLoop } from './game/useGameLoop';
import { getPointAt, getRightAt, getTangentAt } from './game/track';
import { useGameStore } from './game/store';

const EYE_HEIGHT = 1.7;

const eye = new Vector3();
const right = new Vector3();
const fwd = new Vector3();
const look = new Vector3();

/** First person: the camera IS the runner. No avatar is drawn. */
function FirstPersonRig() {
  useGameLoop();

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = runner.distance / TRACK_LENGTH;
    getPointAt(t, eye);
    getRightAt(t, right);
    getTangentAt(t, fwd);

    eye.addScaledVector(right, runner.lateral);
    eye.y = EYE_HEIGHT;

    // Damped so corners and knockbacks do not snap the view.
    const k = 1 - Math.pow(0.0001, dt);
    camera.position.lerp(eye, k);

    look.copy(camera.position).addScaledVector(fwd, 12);
    look.y = EYE_HEIGHT - 0.15;
    camera.lookAt(look);
  });

  return null;
}

/** PLACEHOLDER — P4 replaces this with the real old city. */
function PlaceholderWorld() {
  return (
    <>
      <hemisphereLight args={['#ffe6b8', '#4a3b2a', 1.1]} />
      <directionalLight position={[60, 90, 30]} intensity={1.4} color="#ffd9a0" />
      <fog attach="fog" args={['#e8c79a', 60, 420]} />
      <color attach="background" args={['#e8c79a']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[900, 900]} />
        <meshLambertMaterial color="#9b8f7a" />
      </mesh>
      {/* Markers so motion is perceptible before the city exists. */}
      {Array.from({ length: 60 }, (_, i) => {
        const p = getPointAt(i / 60, new Vector3());
        const r = getRightAt(i / 60, new Vector3());
        return (
          <mesh key={i} position={[p.x + r.x * 9, 1.5, p.z + r.z * 9]}>
            <boxGeometry args={[1, 3, 1]} />
            <meshLambertMaterial color={i % 5 === 0 ? '#a63c2f' : '#c96f4a'} />
          </mesh>
        );
      })}
    </>
  );
}

/** PLACEHOLDER — P5 replaces this with HUD + Screens. */
function PlaceholderUI() {
  const { phase, elapsed, start, reset } = useGameStore();
  const seconds = (elapsed / 1000).toFixed(2);

  if (phase === 'running') {
    return <div className="hud">{seconds}s</div>;
  }
  return (
    <div className="overlay">
      <h1>Chiang Mai Dash</h1>
      <p>{phase === 'finished' ? `Finished in ${seconds}s` : 'A / D to steer'}</p>
      <button onClick={phase === 'finished' ? reset : start}>
        {phase === 'finished' ? 'Again' : 'Start'}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Canvas camera={{ fov: 75, position: [0, EYE_HEIGHT, 0], near: 0.1, far: 900 }}>
        <PlaceholderWorld />
        <FirstPersonRig />
      </Canvas>
      <PlaceholderUI />
    </>
  );
}
