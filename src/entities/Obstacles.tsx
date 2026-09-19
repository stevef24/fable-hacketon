// OWNER: P3 (Keith). Renders every obstacle and hit-tests the runner against them.
// Plain arithmetic only: no physics engine, no raycasting, and never set() on
// the store from useFrame. Everything per-frame lives in module/ref state.
import { memo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color, InstancedMesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, Vector3, type Group,
} from 'three';
import { ROAD_HALF_WIDTH, TRACK_LENGTH, clamp, type ObstacleKind } from '../game/contract';
import { runner } from '../game/runner';
import { useGameStore } from '../game/store';
import { emitEffect, playForKind } from '../ui/audio';
import { getPointAt, getRightAt, getTangentAt } from '../game/track';
import { COURSE, type CourseEntry } from './course';
import { EFFECTS, HIT_LATERAL, applyEffect, isHit } from './effects';
import { RIDER_VARIANTS, SIGN, bubbleTexture, getModel, signTexture } from './models';

const TUMBLE_MS = 600;
/** Where the chasing dog tries to run, relative to the runner. */
const CHASE_AHEAD = 3.5; // metres in front of the runner: peripheral vision, not behind the head
const CHASE_SIDE = 3; // metres to the side
/** Speech bubbles and particles only exist for obstacles this far ahead (metres). */
const BUBBLE_NEAR = 4;
const BUBBLE_FAR = 42;
const FX_BEHIND = 3;
const FX_AHEAD = 70;

/** Ground ring showing the real contact box, so a near miss reads as fair. */
const RING: Record<ObstacleKind, string> = {
  motorbike: '#ff4a3a',
  dog: '#3dff7a',
  massage: '#e63f9c',
  food: '#ffb03a',
  splash: '#19b8ff',
};

// One material each, shared by every obstacle: colour lives in the vertices.
const SOLID = new MeshLambertMaterial({ vertexColors: true });
const GLOW = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });

// ── what each obstacle looks like ───────────────────────────────────────

const hashOf = (id: string) => [...id].reduce((n, c) => n + c.charCodeAt(0), 0);

function modelKey(spec: CourseEntry): string {
  switch (spec.kind) {
    case 'motorbike':
      return spec.ride ? `rider${hashOf(spec.id) % RIDER_VARIANTS}` : 'parked';
    case 'dog':
      return 'dog';
    case 'massage':
      return 'massage';
    case 'food':
      return 'cart';
    case 'splash':
      return 'kid';
  }
}

/** Comic-book speech bubbles, as in the reference art. `y` is where the tail points. */
function bubbleFor(spec: CourseEntry): { text: string; y: number } | null {
  switch (spec.kind) {
    case 'dog':
      return { text: 'Woof!', y: 1.25 };
    case 'food':
      return { text: 'Mango sticky rice!', y: 2.75 };
    case 'motorbike':
      return spec.ride ? { text: 'Beep beep!', y: 2.05 } : null;
    default:
      return null;
  }
}

const Model = memo(function Model({ spec }: { spec: CourseEntry }) {
  const model = getModel(modelKey(spec));
  const bubble = bubbleFor(spec);
  const S = SIGN.scale;
  return (
    <>
      <mesh geometry={model.solid} material={SOLID} />
      {model.glow && <mesh geometry={model.glow} material={GLOW} />}
      {spec.kind === 'massage' && (
        <mesh position={[SIGN.x * S, SIGN.y * S, SIGN.z * S]}>
          <planeGeometry args={[SIGN.w * S, SIGN.h * S]} />
          <meshBasicMaterial map={signTexture()} toneMapped={false} />
        </mesh>
      )}
      {bubble && (
        <sprite name="bubble" visible={false} position={[0, bubble.y, 0]} scale={[1.9, 0.71, 1]} center={[0.5, 0]}>
          <spriteMaterial map={bubbleTexture(bubble.text)} transparent depthWrite={false} />
        </sprite>
      )}
    </>
  );
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
  /** Speech bubble sprite, if this obstacle has one. */
  bubble?: Object3D;
  /** Ground ring marking the contact box. Hidden once hit: it is no longer a hazard. */
  ring?: Object3D;
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

// ── steam and water droplets: one shared InstancedMesh for the whole street ─

const STEAM_PER_CART = 4;
const DROPS_PER_KID = 6;
const FX_CAPACITY =
  COURSE.filter((o) => o.kind === 'food').length * STEAM_PER_CART +
  COURSE.filter((o) => o.kind === 'splash').length * DROPS_PER_KID;

const STEAM = new Color('#ffffff');
const DROP_A = new Color('#7fe0ff');
const DROP_B = new Color('#e4f9ff');
const fxDummy = new Object3D();

/** Add steam/droplet instances for one obstacle. Returns the new instance count. */
function emitFx(mesh: InstancedMesh, n: number, L: Live, i: number, g: Group, time: number): number {
  const cos = Math.cos(g.rotation.y);
  const sin = Math.sin(g.rotation.y);
  const put = (lx: number, ly: number, lz: number, size: number, colour: Color) => {
    fxDummy.position.set(g.position.x + lx * cos + lz * sin, g.position.y + ly, g.position.z - lx * sin + lz * cos);
    fxDummy.scale.setScalar(size);
    fxDummy.updateMatrix();
    mesh.setMatrixAt(n, fxDummy.matrix);
    mesh.setColorAt(n, colour);
    n++;
  };

  if (L.spec.kind === 'food') {
    for (let k = 0; k < STEAM_PER_CART; k++) {
      const u = (time * 0.5 + k / STEAM_PER_CART + i * 0.21) % 1;
      // puffs swell as they rise, then vanish
      put(0.32 + Math.sin((u + k) * 7) * 0.09, 1.3 + u * 1.0, 0.15, (0.1 + u * 0.16) * (1 - u * u), STEAM);
    }
  } else {
    for (let k = 0; k < DROPS_PER_KID; k++) {
      const u = (time * 1.4 + k / DROPS_PER_KID + i * 0.37) % 1;
      const y = 1.3 + 1.5 * u - 3.4 * u * u; // thrown from the bucket, falling to the road
      if (y < 0.05) continue;
      put(((k % 3) - 1) * 0.28 * (0.4 + u), y, 0.75 + u * 1.7, 0.12 * (1 - u * 0.4), k % 2 ? DROP_A : DROP_B);
    }
  }
  return n;
}

export function Obstacles() {
  const phase = useGameStore((s) => s.phase);
  const groups = useRef<(Group | null)[]>([]);
  const hit = useRef(new Set<string>());
  const fx = useRef<InstancedMesh>(null);
  // A new run (or back to the menu) puts the whole street back as it was.
  useEffect(() => {
    if (fx.current) fx.current.count = 0; // no particles until something spawns them
    if (phase === 'finished') return;
    hit.current.clear();
    live.forEach((L, i) => {
      L.dist = L.spec.t * TRACK_LENGTH;
      L.moving = L.gone = false;
      L.hitAt = L.chaseUntil = 0;
      const g = groups.current[i];
      if (!g) return;
      // Everything stands facing the oncoming runner.
      place(g, L.dist, L.laneX, -1);
      L.bubble = g.getObjectByName('bubble');
      if (L.bubble) L.bubble.visible = false;
      L.ring = g.getObjectByName('ring');
      if (L.ring) L.ring.visible = true;
    });
  }, [phase]);

  useFrame((_, rawDt) => {
    if (useGameStore.getState().phase !== 'running') return;
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now();
    let fxCount = 0;

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

        if (L.bubble) {
          const gap = L.dist - runner.distance;
          L.bubble.visible = gap > BUBBLE_NEAR && gap < BUBBLE_FAR && (spec.kind !== 'motorbike' || L.moving);
        }
        if ((spec.kind === 'splash' || spec.kind === 'food') && fx.current) {
          const gap = L.dist - runner.distance;
          if (gap > -FX_BEHIND && gap < FX_AHEAD && fxCount < FX_CAPACITY - DROPS_PER_KID) {
            fxCount = emitFx(fx.current, fxCount, L, i, g, now / 1000);
          }
        }

        if (!hit.current.has(spec.id) && isHit(L.dist, L.laneX)) {
          hit.current.add(spec.id);
          L.hitAt = now;
          if (L.bubble) L.bubble.visible = false;
          if (L.ring) L.ring.visible = false;
          L.side = L.laneX >= runner.lateral ? 1 : -1;
          if (spec.kind === 'dog') {
            L.chaseUntil = now + EFFECTS.dog.durationMs;
            L.off = L.dist - runner.distance; // start the chase from where it was
            L.latRel = L.laneX - runner.lateral;
          }
          applyEffect(spec.kind, now);
          // Discrete hit, not a per-frame write: the results screen and the
          // HUD caption both read these.
          const effect = EFFECTS[spec.kind];
          const store = useGameStore.getState();
          store.bumpStat(effect.stat);
          store.showFlash(effect.label, effect.good);
          emitEffect(spec.kind);
          playForKind(spec.kind);
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
        place(g, runner.distance + L.off, clamp(runner.lateral + L.latRel, -8.5, 8.5), 1);
        g.position.y += Math.abs(Math.sin(since * 16)) * 0.18; // gallop
      } else {
        // Everything else is punted off the road and shrinks away.
        const p = (now - L.hitAt) / TUMBLE_MS;
        if (p >= 1) {
          g.visible = false;
          L.gone = true;
          continue;
        }
        place(g, L.dist, L.laneX, -1);
        g.position.addScaledVector(scratchRight, -L.side * p * 5);
        g.position.y += Math.sin(p * Math.PI) * 1.5;
        g.rotation.z = -L.side * p * 4;
        g.scale.setScalar(1 - p * 0.6);
      }
    }

    const mesh = fx.current;
    if (mesh) {
      mesh.count = fxCount;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={fx} args={[undefined, undefined, FX_CAPACITY]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0.8} depthWrite={false} />
      </instancedMesh>
      {COURSE.map((spec, i) => (
        <group
          key={spec.id}
          ref={(g) => {
            groups.current[i] = g;
          }}
        >
          <Model spec={spec} />
          <mesh name="ring" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <ringGeometry args={[HIT_LATERAL - 0.2, HIT_LATERAL, 32]} />
            <meshBasicMaterial color={RING[spec.kind]} transparent opacity={0.4} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default Obstacles;
