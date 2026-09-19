// OWNER: P4 slot (issue #8, picked up by P1). A Tha Phae style brick gate.
//
// These are the four checkpoints as well as the landmark, so each one is
// signed: you should know which gate you just crossed without reading the HUD.
// Reference: docs/reference/02-title-screen.png.
import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

const BRICK = '#b8553a';
const BRICK_MID = '#a34a33';
const BRICK_DARK = '#7d3a28';

/** Signboard painted at runtime -- no font files to load, nothing to 404. */
function useSignTexture(thai: string, roman: string) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 320;
    const x = c.getContext('2d');
    if (!x) return null;

    x.fillStyle = '#efdcb0';
    x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = '#8a6a43';
    x.lineWidth = 10;
    x.strokeRect(14, 14, c.width - 28, c.height - 28);

    x.fillStyle = '#2f2114';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    // Thai first, as on the real gate. Falls back gracefully if the platform
    // has no Thai face -- the roman line below always carries the meaning.
    x.font = 'bold 120px "Noto Sans Thai", "Thonburi", system-ui, sans-serif';
    x.fillText(thai, c.width / 2, 120);
    x.font = 'bold 76px system-ui, sans-serif';
    x.fillText(roman.toUpperCase(), c.width / 2, 232);

    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [thai, roman]);
}

const HALF_GAP = 11; // towers sit either side of the 16m road
const TOWER_W = 5.5;
const TOWER_H = 13;

function Tower({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      {/* battered base, wider at the bottom like the real brickwork */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[TOWER_W + 1.1, 2, TOWER_W + 1.1]} />
        <meshLambertMaterial color={BRICK_DARK} />
      </mesh>
      <mesh position={[0, TOWER_H / 2 + 1.5, 0]} castShadow>
        <boxGeometry args={[TOWER_W, TOWER_H, TOWER_W]} />
        <meshLambertMaterial color={BRICK} />
      </mesh>
      {/* courses, so it does not read as one flat slab */}
      {[4.5, 8, 11.5].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[TOWER_W + 0.25, 0.4, TOWER_W + 0.25]} />
          <meshLambertMaterial color={BRICK_MID} />
        </mesh>
      ))}
      {/* crenellations */}
      {[-1.8, -0.6, 0.6, 1.8].map((o) => (
        <mesh key={o} position={[o, TOWER_H + 2.3, 0]} castShadow>
          <boxGeometry args={[0.95, 1.5, TOWER_W]} />
          <meshLambertMaterial color={BRICK_DARK} />
        </mesh>
      ))}
      {/* lantern: emissive so the bloom pass catches it */}
      <mesh position={[0, 7.5, TOWER_W / 2 + 0.3]}>
        <boxGeometry args={[0.7, 1.05, 0.7]} />
        <meshStandardMaterial
          color="#ff7a2f"
          emissive="#ff9440"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function Gate({ thai = 'ประตูท่าแพ', roman = 'Tha Phae Gate' }) {
  const sign = useSignTexture(thai, roman);

  // Stepped arch across the opening: cheaper than a torus and it reads as
  // brick courses rather than a smooth tube.
  const arch = useMemo(() => {
    const steps = 9;
    return Array.from({ length: steps }, (_, i) => {
      const a = (i / (steps - 1)) * Math.PI;
      return {
        x: -Math.cos(a) * HALF_GAP,
        y: 11.5 + Math.sin(a) * 3.2,
        rot: a - Math.PI / 2,
      };
    });
  }, []);

  return (
    <group>
      <Tower x={-HALF_GAP} />
      <Tower x={HALF_GAP} />

      {arch.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0]} rotation={[0, 0, b.rot]}>
          <boxGeometry args={[3.4, 1.5, 3.2]} />
          <meshLambertMaterial color={i % 2 ? BRICK : BRICK_MID} />
        </mesh>
      ))}

      {/* lintel */}
      <mesh position={[0, 10.4, 0]} castShadow>
        <boxGeometry args={[HALF_GAP * 2 + 2, 1.8, 3.6]} />
        <meshLambertMaterial color={BRICK_DARK} />
      </mesh>

      {/* signboard, both faces so it reads on approach and on the way out */}
      {sign && (
        <>
          <mesh position={[0, 8.6, 1.9]}>
            <planeGeometry args={[9, 2.8]} />
            <meshLambertMaterial map={sign} />
          </mesh>
          <mesh position={[0, 8.6, -1.9]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[9, 2.8]} />
            <meshLambertMaterial map={sign} />
          </mesh>
        </>
      )}

      {/* Songkran bunting strung across the opening */}
      {Array.from({ length: 15 }, (_, i) => {
        const t = i / 14;
        const x = -HALF_GAP + t * HALF_GAP * 2;
        const sag = Math.sin(t * Math.PI) * 0.9;
        return (
          <mesh key={i} position={[x, 13.4 - sag, 3.2]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.8, 1.15, 0.06]} />
            <meshLambertMaterial
              color={['#e8442f', '#f2b134', '#2f7fbf', '#f7f3e8'][i % 4]}
            />
          </mesh>
        );
      })}
    </group>
  );
}
