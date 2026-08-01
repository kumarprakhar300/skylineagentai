import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, FONT_BODY, FONT_DISPLAY } from "../theme";
import { Display, Eyebrow, Panel } from "../components/Kit";

const bars = [42, 68, 55, 88, 74, 96, 61];

/** Scene 6 — leads dashboard, scoring, analytics, exports, map. */
export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const score = Math.round(
    interpolate(frame, [26, 76], [0, 87], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
  );

  return (
    <AbsoluteFill style={{ padding: "96px 150px" }}>
      <Eyebrow>After the call</Eyebrow>
      <Display size={86} delay={5} style={{ marginTop: 24 }}>
        Summary, score,{" "}
        <span style={{ color: C.goldSoft, fontStyle: "italic" }}>pipeline.</span>
      </Display>

      <div style={{ display: "flex", gap: 34, marginTop: 56 }}>
        {/* score dial */}
        <Panel delay={14} style={{ width: 430, padding: 40 }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: 3, fontSize: 20, color: C.gold }}>
            LEAD SCORE
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 18 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 128, color: C.cream, lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 30, color: `${C.cream}88`, paddingBottom: 20 }}>
              /100
            </div>
          </div>
          <div
            style={{
              marginTop: 20,
              height: 12,
              borderRadius: 8,
              background: `${C.cream}1a`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${score}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${C.forestLight}, ${C.gold})`,
              }}
            />
          </div>
          <div
            style={{
              marginTop: 24,
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: 999,
              background: `${C.clay}33`,
              border: `1px solid ${C.clay}88`,
              fontFamily: FONT_BODY,
              fontWeight: 800,
              fontSize: 24,
              color: C.goldSoft,
            }}
          >
            HOT LEAD
          </div>
        </Panel>

        {/* analytics bars */}
        <Panel delay={22} style={{ flex: 1, padding: 40 }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: 3, fontSize: 20, color: C.gold }}>
            CALLS BY CITY
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 22, height: 210, marginTop: 30 }}>
            {bars.map((h, i) => {
              const g = spring({ frame: frame - (26 + i * 6), fps, config: { damping: 16, stiffness: 120 } });
              return (
                <div key={i} style={{ flex: 1 }}>
                  <div
                    style={{
                      height: h * 2 * g,
                      borderRadius: 10,
                      background:
                        i === 5
                          ? `linear-gradient(180deg, ${C.gold}, ${C.forest})`
                          : `linear-gradient(180deg, ${C.forestLight}, ${C.forest})`,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: FONT_BODY,
              fontSize: 21,
              color: `${C.cream}88`,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {["Pune", "Mumbai", "NCR", "Blr", "Hyd", "All", "Q4"].map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </Panel>

        {/* feature chips */}
        <Panel delay={30} style={{ width: 430, padding: 40 }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: 3, fontSize: 20, color: C.gold }}>
            IN THE DASHBOARD
          </div>
          <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: 14 }}>
            {[
              "Transcript search",
              "Budget filters",
              "CSV export",
              "Live project map",
              "Admin catalog",
              "Role-based access",
            ].map((chip, i) => {
              const p = spring({ frame: frame - (36 + i * 6), fps, config: { damping: 200 } });
              return (
                <div
                  key={chip}
                  style={{
                    padding: "14px 22px",
                    borderRadius: 999,
                    border: `1px solid ${C.cream}2a`,
                    background: `${C.cream}0d`,
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: 23,
                    color: `${C.cream}dd`,
                    opacity: p,
                    transform: `scale(${interpolate(p, [0, 1], [0.9, 1])})`,
                  }}
                >
                  {chip}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};
