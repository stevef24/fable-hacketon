// OWNER: P1 (Stav). Scene assembly, first-person camera, phase routing.
import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ACESFilmicToneMapping } from 'three';
import { Vector3 } from 'three';
import { BASE_SPEED, TRACK_LENGTH } from './game/contract';
import { runner } from './game/runner';
import { useGameLoop } from './game/useGameLoop';
import { getPointAt, getRightAt, getTangentAt } from './game/track';
import { useGameStore } from './game/store';
import Obstacles from './entities/Obstacles';
import City from './world/City';
import HUD from './ui/HUD';
import Screens from './ui/Screens';

const EYE_HEIGHT = 1.75;

const START = getPointAt(0, new Vector3());

const eye = new Vector3();
const right = new Vector3();
const fwd = new Vector3();
const look = new Vector3();

/** First person: the camera IS the runner. No avatar is drawn. */
function FirstPersonRig() {
  useGameLoop();
  const phase = useGameStore((s) => s.phase);
  // The camera starts at the world origin, which is 800m from the road.
  // Snap it onto the track on the first frame instead of letting it fly in.
  const snap = useRef(true);

  useEffect(() => {
    snap.current = true;
  }, [phase]);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = runner.distance / TRACK_LENGTH;
    getPointAt(t, eye);
    getRightAt(t, right);
    getTangentAt(t, fwd);

    eye.addScaledVector(right, runner.lateral);

    // Head bob, scaled by speed. Kept small: big bobs make people queasy.
    const running = phase === 'running';
    const bob = running ? Math.sin(runner.distance * 1.6) * 0.055 * (runner.speed / BASE_SPEED) : 0;
    eye.y = EYE_HEIGHT + bob;

    if (snap.current) {
      camera.position.copy(eye);
      snap.current = false;
    } else {
      camera.position.lerp(eye, 1 - Math.pow(0.0001, dt));
    }

    look.copy(camera.position).addScaledVector(fwd, 14);
    look.y = EYE_HEIGHT - 0.5;
    camera.lookAt(look);


  });

  return null;
}

export default function App() {
  return (
    <>
      <Canvas
        camera={{ fov: 74, position: [START.x, EYE_HEIGHT, START.z], near: 0.1, far: 1400 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.55 }}
      >
        <City />
        <Obstacles />
        <FirstPersonRig />
        {/* Restrained on purpose: overdone bloom reads as a tech demo. */}
        <EffectComposer>
          <Bloom intensity={0.55} luminanceThreshold={0.62} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette offset={0.22} darkness={0.62} />
        </EffectComposer>
      </Canvas>
      <HUD />
      <Screens />
    </>
  );
}
