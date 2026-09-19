// OWNER: P2 (Kevin). First person, so there is no avatar: this is what sells
// running from inside the runner's head — a swinging water bottle, a lean
// into the turn, and field of view that opens up with speed.
//
// Integration note: App.tsx (P1, frozen) drives camera.position/quaternion
// unconditionally every frame via lerp + lookAt, and that callback is
// registered after this hook's, so anything this hook wrote directly to the
// camera's own transform would be overwritten before the frame renders.
// Field of view is untouched by App.tsx, so it is driven directly; the bob
// and lean instead live on a small rig parented to the camera, which is
// composed correctly regardless of callback order because three.js resolves
// the whole scene graph once, at render time, after every useFrame callback
// has run. Call `useViewModel()` once from `useGameLoop` (already inside the
// Canvas via App.tsx's FirstPersonRig) — there is no `<ViewModel/>` JSX to
// mount, so App.tsx never needs to change.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshLambertMaterial,
  type PerspectiveCamera,
} from 'three';
import { BASE_SPEED, MAX_SPEED, MIN_SPEED, STEER_SPEED, clamp } from '../game/contract';
import { runner } from '../game/runner';
import { useGameStore } from '../game/store';

/** Head-bob rate at BASE_SPEED. Scales with current speed below. */
const BOB_HZ_AT_BASE_SPEED = 2;
/**
 * Bob amplitude in metres. Peak-to-peak travel is 2x this — keep it well
 * under the ~8cm line that starts making people motion sick.
 */
const BOB_AMPLITUDE_M = 0.03;

const LEAN_MAX_RAD = 0.06; // ~3.5 degrees — a lean, not a tilt
const LEAN_RESPONSE = 10; // damp() rate, higher = snappier

const FOV_MIN = 75;
const FOV_MAX = 88;
const FOV_RESPONSE = 4; // damp() rate, higher = snappier

/** Rest pose for the prop rig: low-right of frame, out of the way. */
const REST_X = 0.32;
const REST_Y = -0.38;
const REST_Z = -0.55;

function speedFraction(speed: number): number {
  return clamp((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED), 0, 1);
}

/** A low-poly hand gripping a water bottle. Built once, reused every run. */
function buildPropRig(): Group {
  const rig = new Group();
  rig.position.set(REST_X, REST_Y, REST_Z);
  rig.rotation.z = -0.15;

  const bottle = new Mesh(
    new CylinderGeometry(0.035, 0.04, 0.22, 10),
    new MeshLambertMaterial({ color: '#3fa9d6', transparent: true, opacity: 0.85 }),
  );
  bottle.position.y = 0.11;

  const cap = new Mesh(
    new CylinderGeometry(0.02, 0.022, 0.03, 10),
    new MeshLambertMaterial({ color: '#1c6f96' }),
  );
  cap.position.y = 0.235;

  const hand = new Mesh(
    new BoxGeometry(0.09, 0.07, 0.11),
    new MeshLambertMaterial({ color: '#c98a5e' }),
  );
  hand.position.y = -0.02;

  rig.add(bottle, cap, hand);
  return rig;
}

/**
 * Sets up and animates the first-person view model. Call once, from inside
 * the Canvas (useGameLoop already runs there via App.tsx's FirstPersonRig).
 */
export function useViewModel() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const phase = useGameStore((s) => s.phase);

  // Lazy-initialised ref, not useMemo/useState: this is a plain three.js
  // object mutated imperatively every frame, the same pattern runner.ts
  // uses for `runner` and App.tsx uses for its scratch Vector3s.
  const propRigRef = useRef<Group | null>(null);
  if (propRigRef.current === null) propRigRef.current = buildPropRig();
  const bobPhase = useRef(0);
  const prevLateral = useRef(runner.lateral);

  useEffect(() => {
    const rig = propRigRef.current!;
    // The render camera is never added to the scene by R3F itself (App.tsx
    // passes camera options, not JSX), and objects only render when they
    // are reachable from the scene root — so without this, the rig would
    // have a correct transform but never actually draw.
    if (camera.parent !== scene) scene.add(camera);
    camera.add(rig);
    return () => {
      camera.remove(rig);
    };
  }, [camera, scene]);

  useEffect(() => {
    if (phase === 'running') {
      bobPhase.current = 0;
      // Match resetRunner()'s known reset value directly rather than
      // reading runner.lateral here: effect order between this hook and
      // useGameLoop's own resetRunner() effect is incidental to call order,
      // not guaranteed, so relying on it would be fragile. Without this
      // reset, the first frame of a new run that didn't end centered would
      // diff against the previous run's stale ending lateral position and
      // throw a one-frame lean spike.
      prevLateral.current = 0;
    }
  }, [phase]);

  // Read the camera from the frame callback, not the `camera` binding above:
  // mutating a hook's return value directly (rather than via a callback
  // argument) is exactly the pattern App.tsx avoids for the same reason.
  useFrame(({ camera: frameCamera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const running = phase === 'running';
    const frac = speedFraction(runner.speed);
    const rig = propRigRef.current!;

    if (running) {
      const hz = BOB_HZ_AT_BASE_SPEED * clamp(runner.speed / BASE_SPEED, 0.5, 1.8);
      bobPhase.current += dt * hz * Math.PI * 2;
    }
    const bob = running ? Math.sin(bobPhase.current) * BOB_AMPLITUDE_M * (0.4 + 0.6 * frac) : 0;
    rig.position.set(REST_X, REST_Y + bob, REST_Z);

    const lateralVelocity = running ? (runner.lateral - prevLateral.current) / dt : 0;
    prevLateral.current = runner.lateral;
    const leanTarget = clamp(-lateralVelocity / STEER_SPEED, -1, 1) * LEAN_MAX_RAD;
    rig.rotation.z = MathUtils.damp(rig.rotation.z, -0.15 + leanTarget, LEAN_RESPONSE, dt);

    const persp = frameCamera as PerspectiveCamera;
    const fovTarget = running ? FOV_MIN + (FOV_MAX - FOV_MIN) * frac : FOV_MIN;
    persp.fov = MathUtils.damp(persp.fov, fovTarget, FOV_RESPONSE, dt);
    persp.updateProjectionMatrix();
  });
}
