// OWNER: P2 (Kevin). First person, so there is no avatar: this is what sells
// running from inside the runner's head — a hand with a water gun that
// sprays on trigger, a lean into the turn, and field of view that opens up
// with speed.
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
  SphereGeometry,
  Vector3,
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

// A motorbike hit snaps runner.distance back to the last gate (effects.ts,
// P3) with no other feedback, which reads as a warp/glitch rather than a
// crash. This punches the FOV out and pitches the prop rig down for a
// beat as an impact cue -- it does not touch the teleport itself.
const STUMBLE_DURATION_S = 0.35;
const STUMBLE_FOV_KICK = 6;
const STUMBLE_PITCH_RAD = 0.3;

/** Rest pose for the prop rig: low-right of frame, out of the way. */
const REST_X = 0.32;
const REST_Y = -0.38;
const REST_Z = -0.55;

// Water gun spray. Droplets are children of the rig (not the camera
// directly), so they inherit its bob/lean/recoil for free and only need
// their own ballistic motion on top.
const SPRAY_DROPLET_COUNT = 14;
const SPRAY_INTERVAL_S = 0.03; // time between emitted droplets while held
const SPRAY_SPEED = 3.4; // local "metres"/s leaving the nozzle
const SPRAY_SPREAD = 0.35; // lateral/vertical jitter, radians-ish cone
const SPRAY_GRAVITY = 4.2; // downward accel, arcs the stream
const SPRAY_LIFETIME_S = 0.45;

// A small kick per emitted droplet -- otherwise "spraying" reads as a
// static beam turning on rather than a trigger being pulled repeatedly.
const RECOIL_DECAY_S = 0.09;
const RECOIL_KICK_M = 0.015;
const RECOIL_PITCH_RAD = 0.05;

interface Droplet {
  mesh: Mesh;
  velocity: Vector3;
  age: number;
  active: boolean;
}

function speedFraction(speed: number): number {
  return clamp((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED), 0, 1);
}

interface PropRig {
  rig: Group;
  muzzle: Vector3;
  droplets: Droplet[];
}

/** A low-poly hand gripping a toy water gun. Built once, reused every run. */
function buildPropRig(): PropRig {
  const rig = new Group();
  rig.position.set(REST_X, REST_Y, REST_Z);
  rig.rotation.z = -0.15;

  const tank = new Mesh(
    new BoxGeometry(0.15, 0.12, 0.2),
    new MeshLambertMaterial({ color: '#f2b134' }),
  );
  tank.position.set(0, 0.05, 0.03);

  const barrel = new Mesh(
    new CylinderGeometry(0.028, 0.032, 0.26, 10),
    new MeshLambertMaterial({ color: '#3fa9d6' }),
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.07, -0.17);

  const nozzle = new Mesh(
    new CylinderGeometry(0.017, 0.022, 0.05, 8),
    new MeshLambertMaterial({ color: '#1c6f96' }),
  );
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0, 0.07, -0.32);

  const grip = new Mesh(
    new BoxGeometry(0.08, 0.16, 0.09),
    new MeshLambertMaterial({ color: '#e8b98c' }),
  );
  grip.position.set(0, -0.07, 0.07);

  const trigger = new Mesh(
    new BoxGeometry(0.03, 0.05, 0.02),
    new MeshLambertMaterial({ color: '#2b2b2b' }),
  );
  trigger.position.set(0, 0, -0.01);

  const hand = new Mesh(
    new BoxGeometry(0.09, 0.07, 0.13),
    new MeshLambertMaterial({ color: '#e8b98c' }),
  );
  hand.position.set(0, -0.01, 0.06);

  rig.add(tank, barrel, nozzle, grip, trigger, hand);
  // Local to the rig: the nozzle's outer tip, where the spray leaves.
  const muzzle = new Vector3(0, 0.07, -0.345);

  const dropletGeometry = new SphereGeometry(0.012, 6, 6);
  const dropletMaterial = new MeshLambertMaterial({ color: '#8fd9f5', transparent: true, opacity: 0.85 });
  const droplets: Droplet[] = [];
  for (let i = 0; i < SPRAY_DROPLET_COUNT; i++) {
    const mesh = new Mesh(dropletGeometry, dropletMaterial);
    mesh.visible = false;
    rig.add(mesh);
    droplets.push({ mesh, velocity: new Vector3(), age: 0, active: false });
  }

  return { rig, muzzle, droplets };
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
  const propRigRef = useRef<PropRig | null>(null);
  if (propRigRef.current === null) propRigRef.current = buildPropRig();
  const bobPhase = useRef(0);
  const prevLateral = useRef(runner.lateral);
  const seenHitIds = useRef<Set<string>>(new Set());
  const stumbleT = useRef(0);
  const isSpraying = useRef(false);
  const sprayTimer = useRef(0);
  const recoilT = useRef(0);
  const nextDroplet = useRef(0);
  const wasRunning = useRef(false);

  useEffect(() => {
    const { rig } = propRigRef.current!;
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
    // Left mouse held, or Space held, pulls the trigger. Both are global
    // listeners (not scoped to the canvas) so releasing outside the canvas
    // still stops the spray, matching useKeyboard's blur-clears pattern.
    const pointerDown = (e: PointerEvent) => {
      if (e.button === 0) isSpraying.current = true;
    };
    const stop = () => {
      isSpraying.current = false;
    };
    const keyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpraying.current = true;
        e.preventDefault();
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpraying.current = false;
    };
    window.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop);
    };
  }, []);

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
      // Obstacle ids are static across runs (course.ts), so without this a
      // motorbike only ever stumbles the view once per session, not once
      // per run.
      seenHitIds.current.clear();
      stumbleT.current = 0;
    }
  }, [phase]);

  // Read the camera from the frame callback, not the `camera` binding above:
  // mutating a hook's return value directly (rather than via a callback
  // argument) is exactly the pattern App.tsx avoids for the same reason.
  useFrame(({ camera: frameCamera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const running = phase === 'running';
    const frac = speedFraction(runner.speed);
    const { rig, muzzle, droplets } = propRigRef.current!;

    // Don't leave the gun mid-spray, or droplets hanging in the air, across
    // a phase change (e.g. tabbing away mid-spray or finishing a run).
    if (!running && wasRunning.current) {
      // oxlint's react(immutability) rule flags the line below as a false
      // positive: `droplets` is plain mutable three.js state (the same
      // category as `rig`, mutated without complaint a few lines down),
      // never React state or props.
      for (const d of droplets) {
        // oxlint-disable-next-line react/immutability
        d.active = false;
        d.mesh.visible = false;
      }
      isSpraying.current = false;
    }
    wasRunning.current = running;

    if (running) {
      for (const m of runner.modifiers) {
        if (m.kind === 'motorbike' && !seenHitIds.current.has(m.id)) {
          seenHitIds.current.add(m.id);
          stumbleT.current = STUMBLE_DURATION_S;
        }
      }
    }
    stumbleT.current = Math.max(0, stumbleT.current - dt);
    const stumble = stumbleT.current / STUMBLE_DURATION_S;

    // Emit new droplets at a fixed cadence while the trigger is held, not
    // once per frame -- otherwise the rate depends on frame rate. Bounded
    // to the pool size so a huge dt (tab resume) can't spin unboundedly.
    if (running && isSpraying.current) {
      sprayTimer.current -= dt;
      for (let guard = 0; sprayTimer.current <= 0 && guard < droplets.length; guard++) {
        sprayTimer.current += SPRAY_INTERVAL_S;
        const d = droplets[nextDroplet.current];
        nextDroplet.current = (nextDroplet.current + 1) % droplets.length;
        d.active = true;
        d.age = 0;
        d.mesh.visible = true;
        d.mesh.position.copy(muzzle);
        d.velocity.set(
          (Math.random() - 0.5) * SPRAY_SPREAD,
          (Math.random() - 0.5) * SPRAY_SPREAD * 0.6 + 0.15,
          -SPRAY_SPEED * (0.85 + Math.random() * 0.3),
        );
        recoilT.current = RECOIL_DECAY_S;
      }
    } else {
      sprayTimer.current = 0;
    }
    for (const d of droplets) {
      if (!d.active) continue;
      d.age += dt;
      d.velocity.y -= SPRAY_GRAVITY * dt;
      d.mesh.position.addScaledVector(d.velocity, dt);
      if (d.age > SPRAY_LIFETIME_S) {
        d.active = false;
        d.mesh.visible = false;
      }
    }
    recoilT.current = Math.max(0, recoilT.current - dt);
    const recoil = recoilT.current / RECOIL_DECAY_S;

    if (running) {
      const hz = BOB_HZ_AT_BASE_SPEED * clamp(runner.speed / BASE_SPEED, 0.5, 1.8);
      bobPhase.current += dt * hz * Math.PI * 2;
    }
    const bob = running ? Math.sin(bobPhase.current) * BOB_AMPLITUDE_M * (0.4 + 0.6 * frac) : 0;
    rig.position.set(REST_X, REST_Y + bob, REST_Z + recoil * RECOIL_KICK_M);

    // dt can be 0 on the first frame and whenever the tab resumes. Without
    // this guard an unchanged lateral gives 0/0 = NaN, which damp() carries
    // into rig.rotation.z permanently -- the prop then never renders again.
    const lateralVelocity = running && dt > 0 ? (runner.lateral - prevLateral.current) / dt : 0;
    prevLateral.current = runner.lateral;
    const leanTarget = clamp(-lateralVelocity / STEER_SPEED, -1, 1) * LEAN_MAX_RAD;
    rig.rotation.z = MathUtils.damp(rig.rotation.z, -0.15 + leanTarget, LEAN_RESPONSE, dt);
    rig.rotation.x = stumble * STUMBLE_PITCH_RAD + recoil * RECOIL_PITCH_RAD;

    const persp = frameCamera as PerspectiveCamera;
    const fovTarget = (running ? FOV_MIN + (FOV_MAX - FOV_MIN) * frac : FOV_MIN) + stumble * STUMBLE_FOV_KICK;
    persp.fov = MathUtils.damp(persp.fov, fovTarget, FOV_RESPONSE, dt);
    persp.updateProjectionMatrix();
  });
}
