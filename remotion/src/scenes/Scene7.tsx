import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { Body, Display, Eyebrow } from "../components/Kit";

const rows: [string, string][] = [
  ["Candidate", "Prakhar Kumar"],
  ["Live demo", "skylineagentai.lovable.app"],
  ["Voice demo", "Browser mic + Twilio number"],
  ["Stack", "TanStack Start · Cloud · AI Gateway"],
];

/** Scene 7 — closing card with submission details. */
export const Scene7: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = interpolate(frame, [10, 44], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "0 150px", justifyContent: "center" }}>
      <Eyebrow>Built end to end</Eyebrow>
      <Display size={124} delay={6} style={{ marginTop: 30 }}>
        Skyline{" "}
        <span style={{ color: C.goldSoft, fontStyle: "italic" }}>Agent</span>
      </Display>
      <div
        style={{
          height: 3,
          width: 900 * line,
          background: `linear-gradient(90deg, ${C.gold}, transparent)`,
          marginTop: 30,
        }}
      />
      <div style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1180 }}>
        {rows.map(([k, v], i) => {
          const p = spring({ frame: frame - (22 + i * 8), fps, config: { damping: 200 } });
          return (
            <div
              key={k}
              style={{
                display: "flex",
                gap: 30,
                alignItems: "baseline",
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px)`,
                borderBottom: `1px solid ${C.cream}18`,
                paddingBottom: 14,
              }}
            >
              <span
                style={{
                  fontFamily: "Manrope",
                  fontWeight: 700,
                  fontSize: 21,
                  letterSpacing: 3,
                  color: C.gold,
                  textTransform: "uppercase",
                  width: 240,
                }}
              >
                {k}
              </span>
              <span style={{ fontFamily: "Manrope", fontSize: 32, color: C.cream }}>{v}</span>
            </div>
          );
        })}
      </div>
      <Sequence from={64}>
        <Body size={28} style={{ marginTop: 40 }}>
          Hindi · Hinglish · English — qualified, scored and summarised automatically.
        </Body>
      </Sequence>
    </AbsoluteFill>
  );
};
