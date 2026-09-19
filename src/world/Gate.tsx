// OWNER: P4 (1320group). A Tha Phae style brick gate straddling the road.
const BRICK = '#9c4a33';
const BRICK_DARK = '#7d3a28';

export default function Gate({ label }: { label?: string }) {
  const tower = (x: number) => (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[4.5, 10, 4]} />
        <meshLambertMaterial color={BRICK} />
      </mesh>
      {/* crenellations */}
      {[-1.5, -0.5, 0.5, 1.5].map((o) => (
        <mesh key={o} position={[o, 10.6, 0]}>
          <boxGeometry args={[0.8, 1.2, 4]} />
          <meshLambertMaterial color={BRICK_DARK} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group>
      {tower(-9)}
      {tower(9)}
      {/* lintel over the road */}
      <mesh position={[0, 9.2, 0]}>
        <boxGeometry args={[14, 2.4, 3]} />
        <meshLambertMaterial color={BRICK_DARK} />
      </mesh>
      {/* sign board */}
      <mesh position={[0, 7.4, 0.1]}>
        <boxGeometry args={[6, 1.6, 0.3]} />
        <meshLambertMaterial color="#e8d5a8" />
      </mesh>
      {/* bunting */}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-7 + i * 1.4, 8.2 - Math.sin(i * 0.5) * 0.3, 1.6]}>
          <boxGeometry args={[0.7, 1.1, 0.05]} />
          <meshLambertMaterial color={['#e8442f', '#f2b134', '#2f7fbf', '#f0f0f0'][i % 4]} />
        </mesh>
      ))}
      {label ? null : null}
    </group>
  );
}
