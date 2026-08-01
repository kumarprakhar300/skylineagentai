import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, FONT_BODY, FONT_DISPLAY } from "../theme";
import { Body, Display, Eyebrow, Panel } from "../components/Kit";

const langs = [
  { code: "EN", label: "English", line: "\u201cI\u2019m looking for a 3 BHK.\u201d" },
  { code: "HI", label: "\u0939\u093f\u0928\u094d\u0926\u0940", line: "\u201c\u092c\u091c\u091f \u0915\u0930\u0940\u092c \u0967.\u0968\u096b \u0915\u0930\u094b\u0921\u093c \u0939\u0948\u0964\u201d" },
  { code: "HN", label: "Hinglish", line: "\u201cPossession kab tak milega bhai?\u201d" },
  { code: "AUTO", label: "Auto detect", line: "Switches mid-sentence" },
];

/** Scene 2 — multilingual capability, staggered cards. */
export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ padding: "110px 150px" }}>
      <Eyebrow>One agent, four modes</Eyebrow>
      <Display size={92} delay={6} style={{ marginTop: 30 }}>
        Speaks the way <span style={{ color: C.goldSoft, fontStyle: "italic" }}>India</span> speaks.
      </Display>
      <Body size={28} delay={14} style={{ marginTop: 22, maxWidth: 900 }}>
        Language is picked before the call — or detected live, turn by turn.
      </Body>

      <div style={{ display: "flex", gap: 26, marginTop: 64 }}>
        {langs.map((l, i) => {
          const delay = 22 + i * 7;
          const active = spring({
            frame: frame - (60 + i * 14),
            fps,
            config: { damping: 16, stiffness: 120 },
          });
          return (
            <Panel key={l.code} delay={delay} style={{ flex: 1, padding: 34, minHeight: 280 }}>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: 3,
                  color: C.gold,
                }}
              >
                {l.code}
              </div>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 42,
                  color: C.cream,
                  marginTop: 14,
                }}
              >
                {l.label}
              </div>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 24,
                  color: `${C.cream}aa`,
                  marginTop: 20,
                  lineHeight: 1.4,
                  opacity: active,
                  transform: `translateY(${interpolate(active, [0, 1], [14, 0])}px)`,
                }}
              >
                {l.line}
              </div>
              <div
                style={{
                  marginTop: 26,
                  height: 4,
                  borderRadius: 4,
                  width: `${active * 100}%`,
                  background: `linear-gradient(90deg, ${C.forestLight}, ${C.gold})`,
                }}
              />
            </Panel>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
