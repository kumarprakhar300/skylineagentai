import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, FONT_BODY, FONT_DISPLAY } from "../theme";
import { Display, Eyebrow, Panel } from "../components/Kit";

/** Scene 5 — two demo channels: browser mic and a real phone call. */
export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ring = spring({ frame: frame - 40, fps, config: { damping: 9 } });

  return (
    <AbsoluteFill style={{ padding: "104px 150px" }}>
      <Eyebrow>Two ways to demo</Eyebrow>
      <Display size={88} delay={6} style={{ marginTop: 26 }}>
        Browser mic, or a{" "}
        <span style={{ color: C.goldSoft, fontStyle: "italic" }}>real phone call.</span>
      </Display>

      <div style={{ display: "flex", gap: 44, marginTop: 62 }}>
        <Panel delay={16} style={{ flex: 1, padding: 46 }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, letterSpacing: 3, fontSize: 21, color: C.gold }}>
            CHANNEL 01
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 54, color: C.cream, marginTop: 14 }}>
            Web voice demo
          </div>
          <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 18 }}>
            {["Pick language · Start call", "Silence detection + barge-in", "Live transcript on screen"].map(
              (s, i) => {
                const p = spring({ frame: frame - (26 + i * 8), fps, config: { damping: 200 } });
                return (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      opacity: p,
                      transform: `translateX(${interpolate(p, [0, 1], [-18, 0])}px)`,
                      fontFamily: FONT_BODY,
                      fontSize: 27,
                      color: `${C.cream}dd`,
                    }}
                  >
                    <span style={{ color: C.goldSoft, fontSize: 22 }}>◆</span>
                    {s}
                  </div>
                );
              },
            )}
          </div>
          <div
            style={{
              marginTop: 40,
              padding: "18px 26px",
              borderRadius: 999,
              display: "inline-block",
              border: `1px solid ${C.gold}55`,
              background: `${C.forest}66`,
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 24,
              color: C.goldSoft,
            }}
          >
            Ready to call · AGENT
          </div>
        </Panel>

        <Panel delay={26} style={{ flex: 1, padding: 46, position: "relative" }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, letterSpacing: 3, fontSize: 21, color: C.gold }}>
            CHANNEL 02
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 54, color: C.cream, marginTop: 14 }}>
            Twilio phone call
          </div>
          <div
            style={{
              marginTop: 34,
              display: "flex",
              alignItems: "center",
              gap: 26,
            }}
          >
            <div
              style={{
                width: 108,
                height: 108,
                borderRadius: 999,
                border: `2px solid ${C.gold}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 46,
                color: C.goldSoft,
                transform: `scale(${1 + Math.sin(frame / 8) * 0.04 * ring})`,
                boxShadow: `0 0 40px -8px ${C.gold}77`,
              }}
            >
              ☎
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 27, color: `${C.cream}dd`, lineHeight: 1.5 }}>
              Signed webhook → Polly voice
              <br />
              Aditi / Raveena for Hindi
              <br />
              HMAC-SHA1 signature verified
            </div>
          </div>
          <div
            style={{
              marginTop: 38,
              fontFamily: FONT_BODY,
              fontSize: 23,
              color: `${C.cream}88`,
            }}
          >
            /api/twilio/voice · /api/end-call · shared agent brain
          </div>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};
