const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const CHAT_MODEL = "google/gemini-3.6-flash";
export const STT_MODEL = "openai/gpt-4o-mini-transcribe";
/** Higher-accuracy model used when re-transcribing low-confidence audio. */
export const STT_MODEL_HQ = "openai/gpt-4o-transcribe";
export const TTS_MODEL = "openai/gpt-4o-mini-tts";

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chat(
  messages: ChatMessage[],
  options: { json?: boolean } = {},
): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GatewayError(res.status, body);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export type TranscriptionResult = {
  text: string;
  tokens: { token: string; logprob: number }[];
};

export async function transcribe(
  file: File,
  options: { language?: string | null; prompt?: string | null; highQuality?: boolean } = {},
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("model", options.highQuality ? STT_MODEL_HQ : STT_MODEL);
  form.append("file", file, file.name || "recording.wav");
  // A bare ISO-639-1 code only; locales like "hi-IN" are rejected with a 400.
  if (options.language) form.append("language", options.language);
  // Domain vocabulary biases the decoder towards project names, BHK, lakh/crore etc.
  if (options.prompt) form.append("prompt", options.prompt);
  form.append("temperature", "0");
  // Per-token logprobs power the transcript confidence indicators.
  form.append("include[]", "logprobs");

  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GatewayError(res.status, body);
  }

  const data = (await res.json()) as {
    text?: string;
    logprobs?: { token?: string; logprob?: number }[];
  };
  const tokens = (data.logprobs ?? [])
    .filter((entry) => typeof entry.token === "string" && typeof entry.logprob === "number")
    .map((entry) => ({ token: entry.token as string, logprob: entry.logprob as number }));

  return { text: (data.text ?? "").trim(), tokens };
}


export async function speak(text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${GATEWAY}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: text,
      voice: "alloy",
      response_format: "mp3",
      instructions:
        "Speak like a warm, polite Indian real estate sales executive on a phone call. Natural pace, friendly, not robotic. Pronounce Hindi and Hinglish words naturally.",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GatewayError(res.status, body);
  }

  return res.arrayBuffer();
}

export class GatewayError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`AI gateway error ${status}: ${body}`);
    this.status = status;
  }
}

export function gatewayErrorResponse(error: unknown): Response {
  console.error("[ai]", error);
  if (error instanceof GatewayError) {
    const message =
      error.status === 429
        ? "The AI service is rate limited right now. Please wait a moment and try again."
        : error.status === 402
          ? "AI credits are exhausted for this workspace."
          : `AI service error (${error.status}).`;
    return Response.json({ error: message }, { status: error.status === 402 ? 402 : 502 });
  }
  return Response.json(
    { error: error instanceof Error ? error.message : "Unexpected server error" },
    { status: 500 },
  );
}
