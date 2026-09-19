// OWNER: P3 (Keith). Renders every obstacle and hit-tests the runner against them.
// Plain arithmetic only: no physics engine, no raycasting, and never set() on
// the store from useFrame. Everything per-frame lives in module/ref state.
import { memo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { ROAD_HALF_WIDTH, TRACK_LENGTH, clamp, type ObstacleKind } from '../game/contract';
import { runner } from '../game/runner';
import { useGameStore } from '../game/store';
import { getPointAt, getRightAt, getTangentAt } from '../game/track';
import { COURSE, type CourseEntry } from './course';
import { EFFECTS, HIT_LATERAL, applyEffect, isHit } from './effects';

const TUMBLE_MS = 600;
/** Where the chasing dog tries to run, relative to the runner. */
const CHASE_AHEAD = 3.5; // metres in front of the runner: peripheral vision, not behind the head
const CHASE_SIDE = 3; // metres to the side

const COLOR: Record<ObstacleKind, string> = {
  motorbike: '#e01e1e',
  dog: '#d9a566',
  massage: '#e63f9c',
  food: '#ff8a1e',
  splash: '#19b8ff',
};
/** Ground ring showing the real contact box, so a near miss reads as fair. */
const RING: Record<ObstacleKind, string> = { ...COLOR, dog: '#3dff7a' };

// ── models: primitives only, origin on the ground, facing +z ────────────────

function Box({ size, pos, color }: { size: [number, number, number]; pos: [number, number, number]; color: string }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

function Wheel({ pos }: { pos: [number, number, number] }) {
  return (
    <mesh position={pos} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.32, 0.32, 0.18, 12]} />
      <meshLambertMaterial color="#1a1a1a" />
    </mesh>
  );
}

function Motorbike({ rider }: { rider: boolean }) {
  return (
    <>
      <Box size={[0.55, 0.55, 1.9]} pos={[0, 0.6, 0]} color={COLOR.motorbike} />
      <Box size={[0.45, 0.12, 0.8]} pos={[0, 0.95, -0.15]} color="#1a1a1a" />
      <Wheel pos={[0, 0.32, 0.72]} />
      <Wheel pos={[0, 0.32, -0.72]} />
      {rider && (
        <>
          <Box size={[0.5, 0.75, 0.35]} pos={[0, 1.4, -0.15]} color="#1e5bd8" />
          <mesh position={[0, 1.95, -0.05]}>
            <sphereGeometry args={[0.25, 12, 8]} />
            <meshLambertMaterial color="#ffd21e" />
          </mesh>
          <mesh position={[0, 0.85, 1.0]}>
            <sphereGeometry args={[0.13, 8, 6]} />
            <meshBasicMaterial color="#fff6b0" />
          </mesh>
        </>
      )}
    </>
  );
}

function Dog() {
  return (
    <>
      <Box size={[0.4, 0.4, 0.95]} pos={[0, 0.5, 0]} color={COLOR.dog} />
      <Box size={[0.3, 0.3, 0.36]} pos={[0, 0.72, 0.6]} color="#c29563" />
      <Box size={[0.12, 0.1, 0.1]} pos={[0, 0.7, 0.8]} color="#2a1a10" />
      <Box size={[0.08, 0.08, 0.4]} pos={[0, 0.72, -0.62]} color="#c29563" />
      {[-0.15, 0.15].flatMap((x) =>
        [-0.35, 0.35].map((z) => <Box key={`${x}${z}`} size={[0.1, 0.3, 0.1]} pos={[x, 0.15, z]} color="#c29563" />),
      )}
    </>
  );
}

function Massage() {
  return (
    <>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 1.1, 10]} />
        <meshLambertMaterial color={COLOR.massage} />
      </mesh>
      <mesh position={[0, 1.38, 0]}>
        <sphereGeometry args={[0.2, 12, 8]} />
        <meshLambertMaterial color="#f0c8a0" />
      </mesh>
      {/* the A-board she is pointing at */}
      <Box size={[0.8, 0.55, 0.05]} pos={[0.6, 0.6, 0.35]} color="#ffe14d" />
    </>
  );
}

function Food() {
  return (
    <>
      <Box size={[1.5, 0.8, 1.0]} pos={[0, 0.7, 0]} color={COLOR.food} />
      <Wheel pos={[0.8, 0.3, 0.3]} />
      <Wheel pos={[-0.8, 0.3, 0.3]} />
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
        <meshLambertMaterial color="#444" />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <coneGeometry args={[1.15, 0.5, 12]} />
        <meshLambertMaterial color="#e8202a" />
      </mesh>
      <mesh position={[0, 0.65, -0.95]}>
        <cylinderGeometry args={[0.25, 0.28, 1.3, 10]} />
        <meshLambertMaterial color="#2e9e5b" />
      </mesh>
      <mesh position={[0, 1.45, -0.95]}>
        <sphereGeometry args={[0.2, 12, 8]} />
        <meshLambertMaterial color="#f0c8a0" />
      </mesh>
    </>
  );
}

function Splash() {
  return (
    <>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.8, 10]} />
        <meshLambertMaterial color={COLOR.splash} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshLambertMaterial color="#ffcf40" />
      </mesh>
      <mesh position={[0.3, 0.85, 0.15]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.24, 10]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {/* the bucket's worth of water in mid-air */}
      <mesh position={[0.3, 1.05, 0.55]}>
        <sphereGeometry args={[0.4, 12, 8]} />
        <meshBasicMaterial color="#7fe8ff" transparent opacity={0.5} />
      </mesh>
    </>
  );
}

const Model = memo(function Model({ spec }: { spec: CourseEntry }) {
  switch (spec.kind) {
    case 'motorbike':
      return <Motorbike rider={!!spec.ride} />;
    case 'dog':
      return <Dog />;
    case 'massage':
      return <Massage />;
    case 'food':
      return <Food />;
    case 'splash':
      return <Splash />;
  }
});

// ── per-obstacle live state and the frame loop ──────────────────────────────

interface Live {
  spec: CourseEntry;
  laneX: number;
  /** Current metres along the lap. Only riders move it. */
  dist: number;
  moving: boolean;
  gone: boolean;
  hitAt: number;
  /** Which way it is knocked away, or which side the dog runs on. */
  side: number;
  chaseUntil: number;
  /** Chasing dog, relative to the runner. */
  off: number;
  latRel: number;
}

/** Module-level like `runner`: there is exactly one course, and it is mutated 60 times a second. */
const live: Live[] = COURSE.map((spec) => ({
  spec,
  laneX: spec.lane * ROAD_HALF_WIDTH,
  dist: spec.t * TRACK_LENGTH,
  moving: false,
  gone: false,
  hitAt: 0,
  side: 1,
  chaseUntil: 0,
  off: 0,
  latRel: 0,
}));

const scratchPos = new Vector3();
const scratchFwd = new Vector3();
const scratchRight = new Vector3();

/** Put `g` on the road at `dist`/`laneX`, facing along the track (or against it). */
function place(g: Group, dist: number, laneX: number, facing: 1 | -1 = 1) {
  const t = dist / TRACK_LENGTH;
  getPointAt(t, scratchPos);
  getTangentAt(t, scratchFwd);
  getRightAt(t, scratchRight);
  g.position.copy(scratchPos).addScaledVector(scratchRight, laneX);
  g.rotation.set(0, Math.atan2(scratchFwd.x, scratchFwd.z) + (facing === -1 ? Math.PI : 0), 0);
  g.scale.setScalar(1);
  g.visible = true;
}

export function Obstacles() {
  const phase = useGameStore((s) => s.phase);
  const groups = useRef<(Group | null)[]>([]);
  const hit = useRef(new Set<string>());
  // A new run (or back to the menu) puts the whole street back as it was.
  useEffect(() => {
    if (phase === 'finished') return;
    hit.current.clear();
    live.forEach((L, i) => {
      L.dist = L.spec.t * TRACK_LENGTH;
      L.moving = L.gone = false;
      L.hitAt = L.chaseUntil = 0;
      const g = groups.current[i];
      if (g) place(g, L.dist, L.laneX, L.spec.ride ? -1 : 1);
    });
  }, [phase]);

  useFrame((_, rawDt) => {
    if (useGameStore.getState().phase !== 'running') return;
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now();

    for (let i = 0; i < live.length; i++) {
      const L = live[i];
      const g = groups.current[i];
      if (!g || L.gone) continue;
      const { spec } = L;

      if (!L.hitAt) {
        const ride = spec.ride;
        if (ride) {
          if (!L.moving && runner.distance > L.dist - ride.trigger) L.moving = true;
          if (L.moving) {
            L.dist -= ride.speed * dt;
            place(g, L.dist, L.laneX, -1);
            // Ridden past and far behind: nothing to see, nothing to hit.
            if (L.dist < runner.distance - 25) {
              g.visible = false;
              L.gone = true;
              continue;
            }
          }
        }

        if (!hit.current.has(spec.id) && isHit(L.dist, L.laneX)) {
          hit.current.add(spec.id);
          L.hitAt = now;
          L.side = L.laneX >= runner.lateral ? 1 : -1;
          if (spec.kind === 'dog') {
            L.chaseUntil = now + EFFECTS.dog.durationMs;
            L.off = L.dist - runner.distance; // start the chase from where it was
            L.latRel = L.laneX - runner.lateral;
          }
          applyEffect(spec.kind, now);
        }
        continue;
      }

      const since = (now - L.hitAt) / 1000;
      if (spec.kind === 'dog') {
        // The dog runs with you for as long as the boost lasts, then gives up.
        const k = Math.min(1, dt * 6);
        if (now < L.chaseUntil) {
          // Stay on the side with road to spare so it does not run off the edge.
          const side = runner.lateral > 1 ? -1 : runner.lateral < -1 ? 1 : L.side;
          L.latRel += (side * CHASE_SIDE - L.latRel) * k;
          L.off += (CHASE_AHEAD + 2.5 * Math.sin(since * 2.2) - L.off) * k; // surges and drops back
        } else {
          L.off -= runner.speed * dt;
          L.latRel += (L.side * 8 - L.latRel) * Math.min(1, dt * 2);
          if (L.off < -12) {
            g.visible = false;
            L.gone = true;
            continue;
          }
        }
        place(g, runner.distance + L.off, clamp(runner.lateral + L.latRel, -8.5, 8.5));
        g.position.y += Math.abs(Math.sin(since * 16)) * 0.18; // gallop
      } else {
        // Everything else is punted off the road and shrinks away.
        const p = (now - L.hitAt) / TUMBLE_MS;
        if (p >= 1) {
          g.visible = false;
          L.gone = true;
          continue;
        }
        place(g, L.dist, L.laneX, spec.ride ? -1 : 1);
        g.position.addScaledVector(scratchRight, -L.side * p * 5);
        g.position.y += Math.sin(p * Math.PI) * 1.5;
        g.rotation.z = -L.side * p * 4;
        g.scale.setScalar(1 - p * 0.6);
      }
    }
  });

  return (
    <>
      {COURSE.map((spec, i) => (
        <group
          key={spec.id}
          ref={(g) => {
            groups.current[i] = g;
          }}
        >
          <Model spec={spec} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <ringGeometry args={[HIT_LATERAL - 0.2, HIT_LATERAL, 32]} />
            <meshBasicMaterial color={RING[spec.kind]} transparent opacity={0.55} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default Obstacles;
