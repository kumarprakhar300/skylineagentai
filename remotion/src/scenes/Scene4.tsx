import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, FONT_BODY } from "../theme";
import { Body, Display, Eyebrow } from "../components/Kit";

type Turn = { who: "agent" | "cust"; text: string; note?: string };

const turns: Turn[] = [
  { who: "agent", text: "Namaste! Main Aarav bol raha hoon, Skyline Greens se. 2 minute baat kar sakte hain?" },
  { who: "cust", text: "Haan bolo, but 3 BHK hi chahiye \u2014", note: "interruption detected" },
  { who: "agent", text: "Bilkul \u2014 3 BHK, 1,480 sq.ft., \u20b91.32 Cr. Baner mein hai. Budget comfortable hai?" },
  { who: "cust", text: "\u092c\u091c\u091f \u0967.\u0968\u096b \u0915\u0930\u094b\u0921\u093c \u0924\u0915 \u0939\u0940 \u0939\u0948\u0964", note: "budget \u2192 \u20b91.20 Cr" },
];

const Bubble: React.FC<{ turn: Turn; delay: number }> = ({ turn, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 17, stiffness: 130 } });
  const isAgent = turn.who === "agent";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isAgent ? "flex-start" : "flex-end",
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [isAgent ? -40 : 40, 0])}px)`,
      }}
    >
      <div style={{ maxWidth: 720 }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: 2.5,
            color: isAgent ? C.goldSoft : `${C.cream}88`,
            textTransform: "uppercase",
            marginBottom: 10,
            textAlign: isAgent ? "left" : "right",
          }}
        >
          {isAgent ? "Agent \u00b7 Aarav" : "Customer"}
        </div>
        <div
          style={{
            padding: "24px 30px",
            borderRadius: 22,
            borderTopLeftRadius: isAgent ? 6 : 22,
            borderTopRightRadius: isAgent ? 22 : 6,
            background: isAgent
              ? `linear-gradient(150deg, ${C.forest}, #0C2A1E)`
              : "linear-gradient(150deg, rgba(246,242,232,0.13), rgba(246,242,232,0.05))",
            border: `1px solid ${isAgent ? `${C.gold}44` : `${C.cream}22`}`,
            fontFamily: FONT_BODY,
            fontSize: 29,
            lineHeight: 1.45,
            color: C.cream,
            boxShadow: "0 26px 54px -30px rgba(0,0,0,0.8)",
          }}
        >
          {turn.text}
        </div>
        {turn.note ? (
          <div
            style={{
              marginTop: 12,
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 20,
              color: C.clay,
              textAlign: isAgent ? "left" : "right",
            }}
          >
            {turn.note}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Scene 4 — live transcript with barge-in and live extraction. */
export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const bars = 26;
  return (
    <AbsoluteFill style={{ padding: "96px 150px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Natural conversation</Eyebrow>
          <Display size={82} delay={5} style={{ marginTop: 24 }}>
            Interrupt it. It{" "}
            <span style={{ color: C.goldSoft, fontStyle: "italic" }}>adapts.</span>
          </Display>
        </div>
        {/* live waveform */}
        <svg width={340} height={110}>
          {Array.from({ length: bars }).map((_, i) => {
            const h = 12 + Math.abs(Math.sin(frame / 6 + i * 0.7)) * (i % 3 === 0 ? 74 : 44);
            return (
              <rect
                key={i}
                x={i * 13}
                y={100 - h}
                width={5}
                height={h}
                rx={2.5}
                fill={i % 4 === 0 ? C.gold : `${C.forestLight}`}
                opacity={0.85}
              />
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: 54, display: "flex", flexDirection: "column", gap: 26 }}>
        {turns.map((t, i) => (
          <Bubble key={i} turn={t} delay={16 + i * 26} />
        ))}
      </div>

      <Body size={26} delay={118} style={{ marginTop: 34 }}>
          Confidence-scored transcript · Devanagari-safe punctuation · tap to re-transcribe
      </Body>
    </AbsoluteFill>
  );
};
