import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C } from "../theme";

const rings = [
  { x: 1560, y: 220, r: 190, w: 1.5, speed: 1 },
  { x: 300, y: 880, r: 150, w: 1, speed: -0.7 },
  { x: 1720, y: 900, r: 90, w: 2, speed: 1.4 },
];

/** Drifting geometric accents that live across the whole film. */
export const PersistentAccents: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {rings.map((ring, i) => {
          const drift = Math.sin(frame / (90 + i * 30)) * 18 * ring.speed;
          const op = interpolate(Math.sin(frame / 120 + i), [-1, 1], [0.12, 0.34]);
          return (
            <circle
              key={i}
              cx={ring.x + drift}
              cy={ring.y - drift * 0.6}
              r={ring.r}
              fill="none"
              stroke={i === 2 ? C.gold : C.forestLight}
              strokeWidth={ring.w}
              opacity={op}
            />
          );
        })}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = (i * 197 + frame * (0.5 + i * 0.14)) % 1180 - 60;
          return (
            <rect
              key={`d-${i}`}
              x={120 + i * 310}
              y={y}
              width={3}
              height={3}
              fill={i % 2 ? C.goldSoft : C.cream}
              opacity={0.35}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
