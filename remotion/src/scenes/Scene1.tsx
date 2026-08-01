import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { Body, Display, Eyebrow } from "../components/Kit";

/** Scene 1 — hook: brand reveal with animated call ring. */
export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const sweep = interpolate(frame, [8, 46], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "0 150px", justifyContent: "center" }}>
      {/* off-center pulse rings behind type */}
      <AbsoluteFill style={{ alignItems: "flex-end", justifyContent: "center", paddingRight: 120 }}>
        <svg width={760} height={760}>
          {[0, 1, 2].map((i) => {
            const p = ((frame + i * 34) % 102) / 102;
            return (
              <circle
                key={i}
                cx={380}
                cy={380}
                r={interpolate(p, [0, 1], [110, 360])}
                fill="none"
                stroke={C.gold}
                strokeWidth={2}
                opacity={interpolate(p, [0, 1], [0.5, 0]) * pulse}
              />
            );
          })}
          <circle cx={380} cy={380} r={104} fill={`${C.forest}cc`} stroke={`${C.goldSoft}88`} />
          <text
            x={380}
            y={404}
            textAnchor="middle"
            fontSize={78}
            fill={C.goldSoft}
            fontFamily="Manrope"
          >
            ☎
          </text>
        </svg>
      </AbsoluteFill>

      <div style={{ position: "relative", maxWidth: 1080 }}>
        <Eyebrow delay={2}>Assignment · Live AI Calling Agent</Eyebrow>
        <div style={{ height: 34 }} />
        <Display size={148} delay={8}>
          Skyline
        </Display>
        <Display size={148} delay={16} color={C.goldSoft} style={{ fontStyle: "italic" }}>
          Agent
        </Display>
        <div
          style={{
            height: 3,
            width: 640 * sweep,
            background: `linear-gradient(90deg, ${C.gold}, transparent)`,
            marginTop: 34,
          }}
        />
        <Sequence from={30}>
          <Body size={34} style={{ marginTop: 30, maxWidth: 820 }}>
            A real-estate voice agent that calls leads, talks in Hindi, Hinglish or
            English — and qualifies them end to end.
          </Body>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};
