// OWNER: P4 (1320group). The old city: road, moat, walls, buildings, gates.
import { useMemo, useRef } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Vector3, type Mesh } from 'three';
import { GATES } from '../game/contract';
import { getPointAt, getRightAt, getTangentAt } from '../game/track';
import Gate from './Gate';
import Crowd from './Crowd';

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

// The wall carries four gates, one per side -- Tha Phae (t=0), Chiang Mai
// (0.25), Suan Dok (0.5), Chang Phuak (0.75), matching GATES in contract.ts
// plus the start. Reference: docs/reference/, a real Chiang Mai wall photo
// with a crenellated top and small square holes lower in the brick.
const GATE_TS = [0, 0.25, 0.5, 0.75];
const GATE_GAP_HALF_T = 0.004; // ~25.6m either side of the gate centre

function nearGate(t: number): boolean {
  return GATE_TS.some((gt) => {
    const d = Math.abs(t - gt);
    return Math.min(d, 1 - d) < GATE_GAP_HALF_T;
  });
}

export default function City() {
  const road = useMemo(() => ribbon(8, 0, 0), []);
  const verge = useMemo(() => ribbon(13, -0.05, 0), []);
  // Inside the road, above the ground plane -- at y=-0.6 the ground occluded it.
  const moat = useMemo(() => ribbon(11, -0.12, -30), []);
  // Cache the flat y values so the ripple is a pure offset, never cumulative.
  const moatRest = useMemo(
    () => Float32Array.from((moat.getAttribute('position') as BufferAttribute).array),
    [moat],
  );
  const moatRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = moatRef.current;
    if (!mesh) return;
    const attr = mesh.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < arr.length; i += 3) {
      const x = moatRest[i];
      const z = moatRest[i + 2];
      arr[i + 1] =
        moatRest[i + 1] +
        Math.sin(x * 0.09 + t * 1.6) * 0.16 +
        Math.cos(z * 0.11 - t * 1.15) * 0.12;
    }
    attr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });

  const walls = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; h: number }[] = [];
    for (let i = 0; i < 640; i++) {
      const t = i / 640;
      if (nearGate(t)) continue; // gap for the gate tower pair below
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

  // Crenellations along the whole wall, sampled finer than the wall itself
  // so the merlon/gap rhythm reads as brick-scale, not segment-scale.
  const MERLON_SAMPLES = 1280;
  const merlons = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number }[] = [];
    for (let i = 0; i < MERLON_SAMPLES; i += 2) {
      const t = i / MERLON_SAMPLES;
      if (nearGate(t)) continue;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      out.push({
        pos: [p.x - r.x * 46, 5.15, p.z - r.z * 46],
        yaw: Math.atan2(f.x, f.z),
      });
    }
    return out;
  }, []);

  // Small square drainage/arrow-slit holes, a third of the way up the wall
  // face -- faked as dark insets rather than real geometry, same trick as
  // every other flat cosmetic surface in this scene.
  const HOLE_SAMPLES = 320;
  const wallHoles = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number }[] = [];
    for (let i = 0; i < HOLE_SAMPLES; i++) {
      const t = i / HOLE_SAMPLES;
      if (nearGate(t)) continue;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      out.push({
        pos: [p.x - r.x * 44.95, 1.9, p.z - r.z * 44.95],
        yaw: Math.atan2(f.x, f.z),
      });
    }
    return out;
  }, []);

  // Shophouses, per docs/reference/18-shophouses.png: a terrace pressed up
  // against the street with pitched roofs and awnings, not scattered boxes.
  // Front row hugs the road so the street reads as enclosed; a sparser back
  // row gives the skyline depth.
  const shophouses = useMemo(() => {
    const out: {
      pos: [number, number, number];
      yaw: number;
      s: [number, number, number];
      c: string;
      roofY: number;
      roofS: [number, number, number];
      awning: [number, number, number] | null;
      awningC: string;
      balcony: boolean;
    }[] = [];
    const walls = ['#d9b88a', '#c98b5e', '#e0c9a0', '#b5764f', '#d2a978', '#c2a074'];
    const awnings = ['#c8402f', '#e0a032', '#2f6fa8', '#d8d2c4'];
    const COUNT = 440;
    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      const yaw = Math.atan2(f.x, f.z);
      const back = i % 3 === 2;
      const depth = back ? 40 + rand(i * 1.3) * 30 : 19 + rand(i) * 3;
      // Three archetypes plus a sparse landmark, so a terrace has rhythm
      // rather than one silhouette at random scales.
      const arch = i % 3; // 0 narrow shophouse, 1 wide market front, 2 tall
      const landmark = i % 37 === 11;
      const storeys = landmark ? 4 : arch === 1 ? 1 : arch === 2 ? 3 : 2;
      const h = storeys * 3.4;
      const w = back
        ? 9 + rand(i * 2.3) * 8
        : arch === 1
          ? 10.5 + rand(i * 2.3) * 3
          : 6.2 + rand(i * 2.3) * 1.8;
      const d = back ? 9 + rand(i * 5.9) * 8 : 8;
      out.push({
        pos: [p.x + r.x * depth, h / 2, p.z + r.z * depth],
        yaw: yaw + (back ? (rand(i * 7.7) - 0.5) * 0.3 : 0),
        s: [w, h, d],
        c: walls[Math.floor(rand(i * 9.1) * walls.length)],
        roofY: h + (landmark ? 1.9 : 1.1),
        roofS: [w * 0.82, landmark ? 4.2 : 2.2, d * 0.82],
        // Balconies read on the tall narrow types; a single-storey market
        // front with a balcony looks wrong.
        balcony: !back && arch !== 1,
        // Only the street-facing row gets an awning; nobody sees the back.
        awning: back ? null : [w + 1.4, 0.22, 2.2],
        awningC: awnings[Math.floor(rand(i * 4.7) * awnings.length)],
      });
    }
    return out;
  }, []);

  // ── #11: lamp posts down the city side, per 22-street-props.png ────────
  const lampPosts = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < 150; i++) {
      const t = i / 150 + 0.0025;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      out.push({ pos: [p.x + r.x * 10.5, 0, p.z + r.z * 10.5] });
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

  const lanterns = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 260; i++) {
      const t = i / 260;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      out.push([p.x + r.x * 11, 4.6, p.z + r.z * 11]);
    }
    return out;
  }, []);

  // Spectators lining the city side, plus market stalls and umbrellas.
  // Everything instanced: this is several hundred objects on a 6.4km lap.
  const crowd = useMemo(() => {
    const out: { pos: [number, number, number]; c: string; h: number }[] = [];
    const shirts = ['#e8442f', '#f2b134', '#2f7fbf', '#f0f0f0', '#57a05a', '#d46aa8'];
    for (let i = 0; i < 520; i++) {
      const t = i / 520;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const side = rand(i * 1.7) > 0.35 ? 1 : -1;
      const off = side * (9.5 + rand(i * 2.9) * 3.5);
      out.push({
        pos: [p.x + r.x * off, 0, p.z + r.z * off],
        c: shirts[Math.floor(rand(i * 4.3) * shirts.length)],
        h: 0.85 + rand(i * 6.1) * 0.3,
      });
    }
    return out;
  }, []);

  const stalls = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; c: string }[] = [];
    const canopy = ['#e8442f', '#f2b134', '#2f7fbf', '#f0f0f0'];
    for (let i = 0; i < 120; i++) {
      const t = i / 120 + 0.004;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      const off = 14 + rand(i * 3.7) * 4;
      out.push({
        pos: [p.x + r.x * off, 0, p.z + r.z * off],
        yaw: Math.atan2(f.x, f.z),
        c: canopy[Math.floor(rand(i * 8.3) * canopy.length)],
      });
    }
    return out;
  }, []);

  const roadDashes = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number }[] = [];
    for (let i = 0; i < 640; i++) {
      const t = i / 640;
      const p = getPointAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      out.push({ pos: [p.x, 0.03, p.z], yaw: Math.atan2(f.x, f.z) });
    }
    return out;
  }, []);

  // Tha Phae is both start and finish, so it is drawn at t=0 and the other
  // three at their checkpoint positions. Shared between the road-level Gate
  // (offset 0, the one the runner passes under) and the wall's own gate at
  // the same t, 46m out -- one landmark, two placements.
  const gateInfo = useMemo(() => {
    const thai: Record<string, string> = {
      'Tha Phae Gate': 'ประตูท่าแพ',
      'Chiang Mai Gate': 'ประตูเชียงใหม่',
      'Suan Dok Gate': 'ประตูสวนดอก',
      'Chang Phuak Gate': 'ประตูช้างเผือก',
    };
    return [{ id: 'start', name: 'Tha Phae Gate', t: 0 }, ...GATES.slice(0, 3)].map((g) => ({
      id: g.id,
      name: g.name,
      thai: thai[g.name] ?? 'ประตู',
      t: g.t,
    }));
  }, []);

  const gates = useMemo(
    () =>
      gateInfo.map((g) => {
        const p = getPointAt(g.t, new Vector3());
        const f = getTangentAt(g.t, new Vector3());
        return { ...g, pos: [p.x, 0, p.z] as [number, number, number], yaw: Math.atan2(f.x, f.z) };
      }),
    [gateInfo],
  );

  // A gate tower pair fills every wall gap -- the wall's own entrances,
  // distinct from the road-level Gate above.
  const wallGates = useMemo(
    () =>
      gateInfo.map((g) => {
        const p = getPointAt(g.t, new Vector3());
        const r = getRightAt(g.t, new Vector3());
        const f = getTangentAt(g.t, new Vector3());
        return {
          ...g,
          id: `wall-${g.id}`,
          pos: [p.x - r.x * 46, 0, p.z - r.z * 46] as [number, number, number],
          yaw: Math.atan2(f.x, f.z),
        };
      }),
    [gateInfo],
  );

  return (
    <>
      <color attach="background" args={['#ffd9a0']} />
      <fog attach="fog" args={['#ffcf93', 150, 1000]} />
      {/* Low warm key, cool sky fill -- golden hour, per docs/reference/. */}
      <hemisphereLight args={['#bfe0ff', '#6b4a2a', 0.75]} />
      <directionalLight position={[-320, 90, 140]} intensity={2.6} color="#ffc77d" />
      <directionalLight position={[220, 60, -180]} intensity={0.4} color="#8fb6ff" />
      <ambientLight intensity={0.18} color="#ffd9a8" />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <planeGeometry args={[4200, 4200]} />
        <meshLambertMaterial color="#8a9a52" />
      </mesh>

      <mesh geometry={verge}>
        <meshLambertMaterial color="#b09a72" />
      </mesh>
      <mesh geometry={road}>
        <meshLambertMaterial color="#d8c49c" />
      </mesh>
      <mesh geometry={moat} ref={moatRef}>
        {/* Standard, not Lambert: the specular highlight is what makes the
            ripples read as water once bloom catches it. */}
        <meshStandardMaterial
          color="#2e9fc4"
          roughness={0.18}
          metalness={0.34}
          emissive="#0a3d55"
          emissiveIntensity={0.28}
        />
      </mesh>

      <Instances limit={walls.length} range={walls.length}>
        <boxGeometry args={[10.4, 1, 2.2]} />
        <meshLambertMaterial color="#c4603f" />
        {walls.map((w, i) => (
          <Instance key={i} position={w.pos} rotation={[0, w.yaw, 0]} scale={[1, w.h, 1]} />
        ))}
      </Instances>

      {/* Crenellations: the merlons riding the top of the wall. */}
      <Instances limit={merlons.length} range={merlons.length}>
        <boxGeometry args={[2.6, 1.5, 2.3]} />
        <meshLambertMaterial color="#a8492f" />
        {merlons.map((m, i) => (
          <Instance key={i} position={m.pos} rotation={[0, m.yaw, 0]} />
        ))}
      </Instances>

      {/* Small dark insets faking drainage/arrow-slit holes in the brick. */}
      <Instances limit={wallHoles.length} range={wallHoles.length}>
        <boxGeometry args={[0.7, 0.7, 0.15]} />
        <meshLambertMaterial color="#3a1c12" />
        {wallHoles.map((h, i) => (
          <Instance key={i} position={h.pos} rotation={[0, h.yaw, 0]} />
        ))}
      </Instances>

      {/* The wall's own entrances -- a gate tower pair fills each gap. */}
      {wallGates.map((g) => (
        <group key={g.id} position={g.pos} rotation={[0, g.yaw, 0]}>
          <Gate thai={g.thai} roman={g.name} />
        </group>
      ))}

      {/* shophouse walls */}
      <Instances limit={shophouses.length} range={shophouses.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
        {shophouses.map((b, i) => (
          <Instance key={i} position={b.pos} rotation={[0, b.yaw, 0]} scale={b.s} color={b.c} />
        ))}
      </Instances>
      {/* pitched terracotta roofs -- a 4-sided cone is a pyramid, rotated
          45deg so its ridges line up with the walls below */}
      <Instances limit={shophouses.length} range={shophouses.length}>
        <coneGeometry args={[0.72, 1, 4]} />
        <meshLambertMaterial color="#9d4b2f" />
        {shophouses.map((b, i) => (
          <Instance
            key={i}
            position={[b.pos[0], b.roofY, b.pos[2]]}
            rotation={[0, b.yaw + Math.PI / 4, 0]}
            scale={b.roofS}
          />
        ))}
      </Instances>
      {/* shopfront awnings */}
      <Instances limit={shophouses.length} range={shophouses.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
        {shophouses.map((b, i) =>
          b.awning ? (
            <Instance
              key={i}
              position={[b.pos[0], 3.3, b.pos[2]]}
              rotation={[0, b.yaw, 0.12]}
              scale={b.awning}
              color={b.awningC}
            />
          ) : null,
        )}
      </Instances>

      {/* balconies on the narrow and tall shophouse types */}
      <Instances limit={shophouses.length} range={shophouses.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#7a5636" />
        {shophouses.map((b, i) =>
          b.balcony ? (
            <Instance
              key={i}
              position={[b.pos[0], b.s[1] * 0.58, b.pos[2]]}
              rotation={[0, b.yaw, 0]}
              scale={[b.s[0] + 0.5, 0.45, b.s[2] + 0.5]}
            />
          ) : null,
        )}
      </Instances>

      {/* lamp posts: column */}
      <Instances limit={lampPosts.length} range={lampPosts.length}>
        <boxGeometry args={[0.22, 5.2, 0.22]} />
        <meshLambertMaterial color="#2f2a24" />
        {lampPosts.map((l, i) => (
          <Instance key={i} position={[l.pos[0], 2.6, l.pos[2]]} />
        ))}
      </Instances>
      {/* lamp posts: lit head, emissive so the bloom pass catches it */}
      <Instances limit={lampPosts.length} range={lampPosts.length}>
        <boxGeometry args={[0.62, 0.8, 0.62]} />
        <meshStandardMaterial
          color="#ffb257"
          emissive="#ffa23c"
          emissiveIntensity={3.2}
          toneMapped={false}
        />
        {lampPosts.map((l, i) => (
          <Instance key={i} position={[l.pos[0], 5.5, l.pos[2]]} />
        ))}
      </Instances>

      <Instances limit={trees.length} range={trees.length}>
        <sphereGeometry args={[2.6, 6, 5]} />
        <meshLambertMaterial color="#3f6b35" />
        {trees.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      <Instances limit={roadDashes.length} range={roadDashes.length}>
        <boxGeometry args={[0.32, 0.02, 3.4]} />
        <meshLambertMaterial color="#efe3c4" />
        {roadDashes.map((d, i) => (
          <Instance key={i} position={d.pos} rotation={[0, d.yaw, 0]} />
        ))}
      </Instances>

      <Crowd people={crowd} />

      {/* market stall canopies */}
      <Instances limit={stalls.length} range={stalls.length}>
        <boxGeometry args={[3.4, 0.18, 2.4]} />
        <meshLambertMaterial />
        {stalls.map((st, i) => (
          <Instance key={i} position={[st.pos[0], 2.5, st.pos[2]]} rotation={[0, st.yaw, 0]} color={st.c} />
        ))}
      </Instances>
      {/* stall tables */}
      <Instances limit={stalls.length} range={stalls.length}>
        <boxGeometry args={[3, 0.9, 1.6]} />
        <meshLambertMaterial color="#8a6a4a" />
        {stalls.map((st, i) => (
          <Instance key={i} position={[st.pos[0], 0.45, st.pos[2]]} rotation={[0, st.yaw, 0]} />
        ))}
      </Instances>

      <Instances limit={lanterns.length} range={lanterns.length}>
        <boxGeometry args={[0.85, 1.3, 0.85]} />
        <meshStandardMaterial
          color="#ff7a2f"
          emissive="#ff9440"
          emissiveIntensity={2.6}
          toneMapped={false}
        />
        {lanterns.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      {gates.map((g) => (
        <group key={g.id} position={g.pos} rotation={[0, g.yaw, 0]}>
          <Gate thai={g.thai} roman={g.name} />
        </group>
      ))}
    </>
  );
}
