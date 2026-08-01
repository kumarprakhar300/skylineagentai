/**
 * Transcript text hygiene for mixed Hindi / Hinglish / English speech.
 *
 * Speech-to-text output for Devanagari + Latin mixed audio commonly arrives with
 * decomposed matras, zero-width junk, doubled spaces, punctuation glued to the next
 * word, or spaces sitting in front of a danda. Normalising once — on the server, for
 * both the caller's speech and the agent's reply — keeps the live transcript, the
 * stored transcript, the CSV export and the summary prompt all identical.
 */

// Punctuation that should hug the preceding word and be followed by a space.
const TRAILING_PUNCT = ",;:!?।॥.…";

/** Characters that are invisible noise. ZWJ/ZWNJ (200c/200d) are meaningful in Devanagari. */
const INVISIBLE = /[\u200B\u200E\u200F\u2060\uFEFF]/g;

function tidyLine(line: string): string {
  let out = line
    // Collapse horizontal whitespace only — newlines are handled by the caller.
    .replace(/[^\S\n]+/g, " ")
    // No space before closing punctuation: "Wakad , 3 BHK" -> "Wakad, 3 BHK".
    .replace(new RegExp(`\\s+([${TRAILING_PUNCT}])`, "g"), "$1")
    // Collapse repeated punctuation runs ("?? ." -> "?").
    .replace(/([,;:।॥])\1+/g, "$1")
    .replace(/([!?])[!?]+/g, "$1")
    // Space after punctuation when a word follows: "haan,theek" -> "haan, theek".
    .replace(new RegExp(`([${TRAILING_PUNCT}])(?=[^\\s${TRAILING_PUNCT}\\d)\\]}])`, "g"), "$1 ")
    // Keep decimals/lakh figures intact: "1.25 crore" must not become "1. 25 crore".
    .replace(/(\d)\s*([.,])\s*(\d)/g, "$1$2$3")
    // No space inside opening brackets / before closing brackets or quotes.
    .replace(/([([{“‘])\s+/g, "$1")
    .replace(/\s+([)\]}”’])/g, "$1")
    // Devanagari danda always gets breathing room after it.
    .replace(/([।॥])(?=\S)/g, "$1 ")
    .trim();

  // Drop a lone dangling punctuation mark left behind by a clipped recording.
  if (new RegExp(`^[${TRAILING_PUNCT}\\s]+$`).test(out)) out = "";
  return out;
}

/**
 * Normalise a spoken-language string while preserving intentional line breaks.
 * Returns "" for empty / punctuation-only input so callers can skip the turn.
 */
export function cleanSpokenText(input: string | null | undefined): string {
  if (!input) return "";

  const normalized = input
    // NFC recomposes Devanagari matras so "क" + matra renders and searches as one grapheme.
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(/\r\n?/g, "\n")
    // Never allow more than one blank line between paragraphs.
    .replace(/\n{3,}/g, "\n\n");

  return normalized
    .split("\n")
    .map(tidyLine)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();
}
