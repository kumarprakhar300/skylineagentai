import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadBody } from "@remotion/google-fonts/Manrope";
import { PersistentBackground } from "./components/PersistentBackground";
import { PersistentAccents } from "./components/PersistentAccents";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";
import { Scene6 } from "./scenes/Scene6";
import { Scene7 } from "./scenes/Scene7";

loadDisplay("normal", { weights: ["600"], subsets: ["latin"] });
loadDisplay("italic", { weights: ["600"], subsets: ["latin"] });
loadBody("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "devanagari"] });

const t = (frames: number) => springTiming({ config: { damping: 200 }, durationInFrames: frames });

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PersistentBackground />
      <PersistentAccents />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={t(20)} />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t(20)} />
        <TransitionSeries.Sequence durationInFrames={135}>
          <Scene3 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(20)} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={t(20)} />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene5 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t(20)} />
        <TransitionSeries.Sequence durationInFrames={135}>
          <Scene6 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(20)} />
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene7 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
