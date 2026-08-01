import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C } from "../theme";

/**
 * Full-duration background: warm-to-forest gradient with slow drifting
 * light pools. Frame-driven only.
 */
export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  const hueShift = interpolate(t, [0, 1], [0, 18]);
  const poolX = 30 + Math.sin(frame / 220) * 14;
  const poolY = 40 + Math.cos(frame / 180) * 12;
  const pool2X = 78 + Math.cos(frame / 260) * 10;

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at ${poolX}% ${poolY}%, ${C.forest}bb 0%, transparent 68%),
                       radial-gradient(45% 50% at ${pool2X}% 78%, ${C.forestLight}66 0%, transparent 70%),
                       linear-gradient(${140 + hueShift}deg, #07150F 0%, ${C.ink} 55%, #0E2A20 100%)`,
        }}
      />
      {/* fine grid, adds depth without noise */}
      <AbsoluteFill
        style={{
          opacity: 0.16,
          backgroundImage: `linear-gradient(${C.creamDim}22 1px, transparent 1px), linear-gradient(90deg, ${C.creamDim}22 1px, transparent 1px)`,
          backgroundSize: "88px 88px",
          transform: `translateY(${(frame % 88) * -0.25}px)`,
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(70% 70% at 50% 45%, transparent 40%, rgba(3,10,7,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
