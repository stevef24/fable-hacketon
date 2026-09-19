// OWNER: P4 (1320group). The old city: road, moat, walls, buildings, gates.
import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { GATES } from '../game/contract';
import { getPointAt, getRightAt, getTangentAt } from '../game/track';
import Gate from './Gate';

const SAMPLES = 420;

/** A flat ribbon following the track, `halfWidth` metres either side. */
function ribbon(halfWidth: number, y: number, offset = 0): BufferGeometry {
  const pos = new Float32Array(SAMPLES * 2 * 3);
  const idx: number[] = [];
  const p = new Vector3();
  const r = new Vector3();

  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1);
    getPointAt(t, p);
    getRightAt(t, r);
    const cx = p.x + r.x * offset;
    const cz = p.z + r.z * offset;
    const a = i * 6;
    pos[a] = cx - r.x * halfWidth;
    pos[a + 1] = y;
    pos[a + 2] = cz - r.z * halfWidth;
    pos[a + 3] = cx + r.x * halfWidth;
    pos[a + 4] = y;
    pos[a + 5] = cz + r.z * halfWidth;
    if (i < SAMPLES - 1) {
      const v = i * 2;
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Deterministic pseudo-random so the city looks the same every run. */
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function City() {
  const road = useMemo(() => ribbon(8, 0, 0), []);
  const verge = useMemo(() => ribbon(13, -0.05, 0), []);
  // Inside the road, above the ground plane -- at y=-0.6 the ground occluded it.
  const moat = useMemo(() => ribbon(11, -0.12, -30), []);

  const walls = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; h: number }[] = [];
    for (let i = 0; i < 640; i++) {
      const t = i / 640;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      out.push({
        pos: [p.x - r.x * 46, 2.4, p.z - r.z * 46],
        yaw: Math.atan2(f.x, f.z),
        h: 4.8 + rand(i) * 0.6,
      });
    }
    return out;
  }, []);

  const buildings = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; s: [number, number, number]; c: string }[] = [];
    const palette = ['#c98b5e', '#b5764f', '#d9a978', '#a86b47', '#c2a074', '#8f5f3f'];
    for (let i = 0; i < 300; i++) {
      const t = i / 300;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      const depth = 20 + rand(i) * 55;
      const h = 5 + rand(i * 3.1) * 13;
      out.push({
        pos: [p.x + r.x * depth, h / 2, p.z + r.z * depth],
        yaw: Math.atan2(f.x, f.z) + (rand(i * 7.7) - 0.5) * 0.35,
        s: [7 + rand(i * 2.3) * 9, h, 7 + rand(i * 5.9) * 9],
        c: palette[Math.floor(rand(i * 9.1) * palette.length)],
      });
    }
    return out;
  }, []);

  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const p = getPointAt(t + 0.0012, new Vector3());
      const r = getRightAt(t, new Vector3());
      const side = i % 2 === 0 ? -12 : 15;
      out.push([p.x + r.x * side, 2.6, p.z + r.z * side]);
    }
    return out;
  }, []);

  const gates = useMemo(
    () =>
      [{ id: 'start', name: 'Tha Phae Gate', t: 0 }, ...GATES.slice(0, 3)].map((g) => {
        const p = getPointAt(g.t, new Vector3());
        const f = getTangentAt(g.t, new Vector3());
        return { id: g.id, pos: [p.x, 0, p.z] as [number, number, number], yaw: Math.atan2(f.x, f.z) };
      }),
    [],
  );

  return (
    <>
      <color attach="background" args={['#f0b978']} />
      <fog attach="fog" args={['#f0b978', 90, 520]} />
      <hemisphereLight args={['#ffe2b0', '#5c4630', 1.05]} />
      <directionalLight position={[-160, 120, 80]} intensity={1.5} color="#ffd08a" />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <planeGeometry args={[4200, 4200]} />
        <meshLambertMaterial color="#6f7a4a" />
      </mesh>

      <mesh geometry={verge}>
        <meshLambertMaterial color="#8d8468" />
      </mesh>
      <mesh geometry={road}>
        <meshLambertMaterial color="#b0a48c" />
      </mesh>
      <mesh geometry={moat}>
        <meshLambertMaterial color="#3f92b0" />
      </mesh>

      <Instances limit={walls.length} range={walls.length}>
        <boxGeometry args={[10.4, 1, 2.2]} />
        <meshLambertMaterial color="#9c4a33" />
        {walls.map((w, i) => (
          <Instance key={i} position={w.pos} rotation={[0, w.yaw, 0]} scale={[1, w.h, 1]} />
        ))}
      </Instances>

      <Instances limit={buildings.length} range={buildings.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
        {buildings.map((b, i) => (
          <Instance key={i} position={b.pos} rotation={[0, b.yaw, 0]} scale={b.s} color={b.c} />
        ))}
      </Instances>

      <Instances limit={trees.length} range={trees.length}>
        <sphereGeometry args={[2.6, 6, 5]} />
        <meshLambertMaterial color="#3f6b35" />
        {trees.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      {gates.map((g) => (
        <group key={g.id} position={g.pos} rotation={[0, g.yaw, 0]}>
          <Gate />
        </group>
      ))}
    </>
  );
}
