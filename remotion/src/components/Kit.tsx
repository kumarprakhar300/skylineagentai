import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";

/** Small uppercase eyebrow label used at the top of every scene. */
export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-28, 0])}px)`,
      }}
    >
      <div style={{ width: 54, height: 2, background: C.gold }} />
      <span
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 700,
          letterSpacing: 6,
          fontSize: 20,
          color: C.goldSoft,
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
    </div>
  );
};

/** Glass card with soft depth. No backdropFilter (renderer safe). */
export const Panel: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  delay?: number;
  lift?: number;
}> = ({ children, style, delay = 0, lift = 46 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });
  const float = Math.sin((frame - delay) / 46) * 4;
  return (
    <div
      style={{
        borderRadius: 26,
        background: "linear-gradient(150deg, rgba(246,242,232,0.10), rgba(246,242,232,0.03))",
        border: `1px solid ${C.cream}22`,
        boxShadow: `0 34px 70px -30px rgba(0,0,0,0.75), inset 0 1px 0 ${C.cream}18`,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [lift, 0]) + float}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Display: React.FC<{
  children: React.ReactNode;
  size?: number;
  delay?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, size = 96, delay = 0, color = C.cream, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 170 } });
  return (
    <div
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.02,
        color,
        letterSpacing: -1.5,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${interpolate(s, [0, 1], [0.96, 1])})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Body: React.FC<{
  children: React.ReactNode;
  size?: number;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 30, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        fontFamily: FONT_BODY,
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1.5,
        color: `${C.cream}cc`,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
