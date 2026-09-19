// OWNER: P3 (Keith). Renders every obstacle and hit-tests the runner.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { ROAD_HALF_WIDTH, TRACK_LENGTH, type ObstacleKind } from '../game/contract';
import { runner } from '../game/runner';
import { getPointAt, getRightAt, getTangentAt } from '../game/track';
import { useGameStore } from '../game/store';
import { COURSE } from './course';
import { applyEffect, EFFECTS } from './effects';

const HIT_ALONG = 2.2; // metres
const HIT_ACROSS = 1.8;
/** Only draw what is plausibly visible; the lap is 6.4km long. */
const DRAW_RANGE = 320;

function Motorbike() {
  return (
    <group>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.8, 0.5, 1.9]} />
        <meshLambertMaterial color="#d7263d" />
      </mesh>
      <mesh position={[0, 1.15, -0.2]}>
        <boxGeometry args={[0.5, 0.45, 0.5]} />
        <meshLambertMaterial color="#2b2b2b" />
      </mesh>
      <mesh position={[0, 0.3, 0.75]}>
        <boxGeometry args={[0.25, 0.6, 0.6]} />
        <meshLambertMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

function Dog() {
  return (
    <group>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.45, 0.4, 1.0]} />
        <meshLambertMaterial color="#d9a066" />
      </mesh>
      <mesh position={[0, 0.75, 0.55]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshLambertMaterial color="#e8b57c" />
      </mesh>
    </group>
  );
}

function Person({ top, bottom }: { top: string; bottom: string }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.55, 1.0, 0.4]} />
        <meshLambertMaterial color={bottom} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.45]} />
        <meshLambertMaterial color={top} />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <meshLambertMaterial color="#e8b98c" />
      </mesh>
    </group>
  );
}

function FoodCart() {
  return (
    <group>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.6, 1.0, 0.9]} />
        <meshLambertMaterial color="#c97b3c" />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[2.1, 0.12, 1.4]} />
        <meshLambertMaterial color="#f2b134" />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.12, 1.0, 0.12]} />
        <meshLambertMaterial color="#8a6a4a" />
      </mesh>
    </group>
  );
}

function WetZone() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <circleGeometry args={[2.4, 20]} />
      <meshLambertMaterial color="#5ec6ef" transparent opacity={0.65} />
    </mesh>
  );
}

const SHAPES: Record<ObstacleKind, () => React.ReactElement> = {
  motorbike: Motorbike,
  dog: Dog,
  massage: () => <Person top="#b5539c" bottom="#6d3f8f" />,
  food: FoodCart,
  splash: WetZone,
};

export default function Obstacles() {
  const phase = useGameStore((s) => s.phase);
  const hit = useRef(new Set<string>());
  const group = useRef<(import('three').Group | null)[]>([]);

  useEffect(() => {
    if (phase === 'running') hit.current.clear();
  }, [phase]);

  const placed = useMemo(
    () =>
      COURSE.map((spec) => {
        const p = getPointAt(spec.t, new Vector3());
        const r = getRightAt(spec.t, new Vector3());
        const f = getTangentAt(spec.t, new Vector3());
        const laneX = spec.lane * ROAD_HALF_WIDTH;
        return {
          spec,
          laneX,
          at: spec.t * TRACK_LENGTH,
          pos: p.clone().addScaledVector(r, laneX),
          yaw: Math.atan2(f.x, f.z),
        };
      }),
    [],
  );

  useFrame(() => {
    // Cull far-away obstacles rather than drawing 55 of them across 6.4km.
    for (let i = 0; i < placed.length; i++) {
      const g = group.current[i];
      if (!g) continue;
      const d = placed[i].at - runner.distance;
      g.visible = d > -40 && d < DRAW_RANGE;
    }

    if (phase !== 'running') return;
    for (const { spec, laneX, at } of placed) {
      if (hit.current.has(spec.id)) continue;
      if (Math.abs(runner.distance - at) > HIT_ALONG) continue;
      if (Math.abs(runner.lateral - laneX) > HIT_ACROSS) continue;
      hit.current.add(spec.id);
      applyEffect(spec.kind, spec.id);
      const e = EFFECTS[spec.kind];
      const store = useGameStore.getState();
      if (e.stat) store.bumpStat(e.stat);
      store.showFlash(e.label, e.good);
    }
  });

  return (
    <>
      {placed.map(({ spec, pos, yaw }, i) => {
        const Shape = SHAPES[spec.kind];
        return (
          <group
            key={spec.id}
            ref={(el) => {
              group.current[i] = el;
            }}
            position={[pos.x, 0, pos.z]}
            rotation={[0, yaw, 0]}
          >
            <Shape />
          </group>
        );
      })}
    </>
  );
}
