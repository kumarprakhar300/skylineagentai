import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stillFrames = process.env.STILLS ? process.env.STILLS.split(",").map(Number) : null;

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

if (stillFrames) {
  for (const f of stillFrames) {
    await renderStill({
      composition,
      serveUrl: bundled,
      output: `/tmp/qa/frame-${f}.png`,
      frame: f,
      puppeteerInstance: browser,
      overwrite: true,
    });
    console.log("still", f);
  }
} else {
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    crf: 18,
    outputLocation: "/mnt/documents/Skyline_Agent_Explainer.mp4",
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 20 === 0) console.log("progress", Math.round(progress * 100));
    },
  });
}

await browser.close({ silent: false });
