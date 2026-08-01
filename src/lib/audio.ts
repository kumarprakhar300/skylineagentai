/** Client-side microphone capture that produces complete 16 kHz mono WAV files. */

const TARGET_RATE = 16000;

function downsample(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_RATE) return input;
  const ratio = inputRate / TARGET_RATE;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    output[i] = input[Math.floor(i * ratio)] ?? 0;
  }
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
  const samples = downsample(merged, inputRate);

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
};

export async function startRecording(options?: {
  onSilence?: () => void;
  silenceMs?: number;
}): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let currentLevel = 0;
  let hasSpoken = false;
  let silenceStart = 0;
  let stopped = false;
  const silenceMs = options?.silenceMs ?? 1400;

  processor.onaudioprocess = (event) => {
    const data = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
    const rms = Math.sqrt(sum / data.length);
    currentLevel = rms;

    if (rms > 0.02) {
      hasSpoken = true;
      silenceStart = 0;
    } else if (hasSpoken && !stopped) {
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
