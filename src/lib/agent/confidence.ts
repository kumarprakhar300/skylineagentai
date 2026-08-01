/**
 * Segment-level transcription confidence.
 *
 * The STT model returns per-token logprobs. We fold those tokens into short
 * phrase segments so the UI can show which parts of a customer turn the model
 * was unsure about — and offer a one-tap re-transcribe for those parts.
 */

export type ConfidenceSegment = {
  /** Display text for this chunk of the turn. */
  text: string;
  /** 0..1 confidence for the chunk (min token probability, the pessimistic read). */
  confidence: number;
};

export type SttToken = { token: string; logprob: number };

/** Words per phrase segment before we force a break. */
const MAX_WORDS_PER_SEGMENT = 4;

export const LOW_CONFIDENCE = 0.72;
export const MEDIUM_CONFIDENCE = 0.9;

export type ConfidenceBand = "low" | "medium" | "high";

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence < LOW_CONFIDENCE) return "low";
  if (confidence < MEDIUM_CONFIDENCE) return "medium";
  return "high";
}

export function confidencePercent(confidence: number): number {
  return Math.round(Math.max(0, Math.min(1, confidence)) * 100);
}

/** Overall confidence of a turn = lowest segment confidence. */
export function turnConfidence(segments: ConfidenceSegment[] | undefined): number | undefined {
  if (!segments || segments.length === 0) return undefined;
  return segments.reduce((min, segment) => Math.min(min, segment.confidence), 1);
}

export function hasLowConfidence(segments: ConfidenceSegment[] | undefined): boolean {
  const overall = turnConfidence(segments);
  return overall !== undefined && overall < LOW_CONFIDENCE;
}

/**
 * Group STT tokens into phrase segments. Tokens carry their own leading
 * whitespace, so a token starting with a space begins a new word.
 */
export function segmentsFromTokens(tokens: SttToken[]): ConfidenceSegment[] {
  const words: { text: string; confidence: number }[] = [];

  for (const token of tokens) {
    const probability = Math.exp(token.logprob);
    const startsWord = words.length === 0 || /^[\s]/.test(token.token);
    if (startsWord) {
      words.push({ text: token.token, confidence: probability });
    } else {
      const current = words[words.length - 1]!;
      current.text += token.token;
      current.confidence = Math.min(current.confidence, probability);
    }
  }

  const segments: ConfidenceSegment[] = [];
  let buffer: { text: string; confidence: number }[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.map((word) => word.text).join("");
    const confidence = buffer.reduce((min, word) => Math.min(min, word.confidence), 1);
    if (text.trim()) segments.push({ text, confidence });
    buffer = [];
  };

  for (const word of words) {
    buffer.push(word);
    const endsClause = /[.!?,;।॥…]\s*$/.test(word.text);
    if (endsClause || buffer.length >= MAX_WORDS_PER_SEGMENT) flush();
  }
  flush();

  return segments;
}
