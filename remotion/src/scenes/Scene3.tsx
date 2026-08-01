import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, FONT_BODY, FONT_DISPLAY } from "../theme";
import { Body, Display, Eyebrow } from "../components/Kit";

const steps = [
  { n: "01", t: "Intent", d: "Buy \u00b7 Invest \u00b7 Rent" },
  { n: "02", t: "Location", d: "Pune \u00b7 Mumbai \u00b7 NCR" },
  { n: "03", t: "Budget", d: "\u20b91.25 Cr range" },
  { n: "04", t: "Config", d: "2 / 3 / 4 BHK" },
  { n: "05", t: "Timeline", d: "Possession need" },
  { n: "06", t: "Score", d: "Hot \u00b7 Warm \u00b7 Cold" },
];

/** Scene 3 — the qualification pipeline, drawn as a traced path. */
export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const trace = interpolate(frame, [14, 90], [0, 1], { extrapolateRight: "clamp" });
  const pathLen = 1560;

  return (
    <AbsoluteFill style={{ padding: "110px 150px" }}>
      <Eyebrow>Qualification flow</Eyebrow>
      <Display size={90} delay={6} style={{ marginTop: 28 }}>
        Six questions.{" "}
        <span style={{ color: C.goldSoft, fontStyle: "italic" }}>One scored lead.</span>
      </Display>
      <Body size={28} delay={12} style={{ marginTop: 20, maxWidth: 940 }}>
        Every answer is extracted into structured fields while the conversation stays natural.
      </Body>

      <div style={{ position: "relative", marginTop: 90, height: 420 }}>
        <svg width={1620} height={200} style={{ position: "absolute", top: 60, left: 0 }}>
          <line
            x1={40}
            y1={40}
            x2={1580}
            y2={40}
            stroke={`${C.cream}22`}
            strokeWidth={2}
          />
          <line
            x1={40}
            y1={40}
            x2={1580}
            y2={40}
            stroke={C.gold}
            strokeWidth={3}
            strokeDasharray={pathLen}
            strokeDashoffset={pathLen * (1 - trace)}
          />
        </svg>
        <div style={{ display: "flex", gap: 0, position: "relative" }}>
          {steps.map((s, i) => {
            const delay = 18 + i * 9;
            const pop = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 150 } });
            const lit = trace > (i + 0.4) / steps.length ? 1 : 0.35;
            return (
              <div
                key={s.n}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  opacity: pop,
                  transform: `translateY(${interpolate(pop, [0, 1], [46, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 999,
                    background: `linear-gradient(160deg, ${C.forest}, #0A2318)`,
                    border: `2px solid ${lit > 0.5 ? C.gold : `${C.cream}33`}`,
                    boxShadow: lit > 0.5 ? `0 0 34px -6px ${C.gold}88` : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT_BODY,
                    fontWeight: 800,
                    fontSize: 28,
                    color: lit > 0.5 ? C.goldSoft : `${C.cream}88`,
                    marginTop: 52,
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 38,
                    color: C.cream,
                    marginTop: 26,
                    opacity: lit,
                  }}
                >
                  {s.t}
                </div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 21,
                    color: `${C.cream}88`,
                    marginTop: 10,
                    textAlign: "center",
                    opacity: lit,
                  }}
                >
                  {s.d}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
