/** Client-side microphone capture that produces complete 16 kHz mono WAV files. */

const TARGET_RATE = 16000;

/**
 * Box-average downsample. Nearest-sample picking aliases high frequencies into
 * the speech band, which is what makes words come out garbled in the transcript.
 */
function downsample(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_RATE) return input;
  const ratio = inputRate / TARGET_RATE;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += input[j] ?? 0;
      count++;
    }
    output[i] = count > 0 ? sum / count : (input[start] ?? 0);
  }
  return output;
}

/** Normalise quiet recordings so soft speech still reaches the model clearly. */
function normalize(samples: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = Math.abs(samples[i] ?? 0);
    if (value > peak) peak = value;
  }
  if (peak < 0.001 || peak > 0.85) return samples;
  const gain = Math.min(6, 0.85 / peak);
  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) output[i] = (samples[i] ?? 0) * gain;
  return output;
}


export function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  const samples = normalize(downsample(merged, inputRate));

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let pos = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export type RecorderHandle = {
  stop: () => Promise<Blob>;
  level: () => number;
  /** Milliseconds of actual speech detected (not silence). */
  spokenMs: () => number;
};

export async function startRecording(options?: {
  onSilence?: () => void;
  silenceMs?: number;
}): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  });

  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  const frameMs = (4096 / ctx.sampleRate) * 1000;

  let currentLevel = 0;
  let hasSpoken = false;
  let spokenMs = 0;
  let silenceStart = 0;
  let stopped = false;
  // Calibrate the room's noise floor from the first ~400 ms so a noisy mic does
  // not read as constant speech (and a quiet one still triggers reliably).
  let noiseFloor = 0.006;
  let calibrationFrames = 0;

  const silenceMs = options?.silenceMs ?? 1400;
  const minSpeechMs = 350;

  processor.onaudioprocess = (event) => {
    const data = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
    const rms = Math.sqrt(sum / data.length);
    currentLevel = rms;

    if (calibrationFrames < Math.ceil(400 / frameMs)) {
      calibrationFrames++;
      noiseFloor = Math.max(noiseFloor, rms);
      return;
    }

    const speechThreshold = Math.max(0.012, noiseFloor * 2.5);

    if (rms > speechThreshold) {
      hasSpoken = true;
      spokenMs += frameMs;
      silenceStart = 0;
      return;
    }

    // Slowly track a drifting noise floor while nobody is talking.
    noiseFloor = noiseFloor * 0.95 + rms * 0.05;

    if (hasSpoken && spokenMs >= minSpeechMs && !stopped) {
      const now = performance.now();
      if (silenceStart === 0) silenceStart = now;
      else if (now - silenceStart > silenceMs) {
        stopped = true;
        options?.onSilence?.();
      }
    }
  };

  source.connect(processor);
  processor.connect(ctx.destination);

  return {
    level: () => currentLevel,
    spokenMs: () => spokenMs,
    stop: async () => {
      stream.getTracks().forEach((t) => t.stop());
      processor.disconnect();
      source.disconnect();
      const rate = ctx.sampleRate;
      await ctx.close().catch(() => {});
      return encodeWav(chunks, rate);
    },
  };
}

