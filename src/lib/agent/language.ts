/** Language the caller chooses before starting a call. Shared by UI + server. */
export const languageOptions = [
  { value: "auto", label: "Auto detect (all)", hint: "Mix Hindi, Hinglish and English freely" },
  { value: "english", label: "English", hint: "Indian English" },
  { value: "hindi", label: "हिन्दी (Hindi)", hint: "Devanagari Hindi" },
  { value: "hinglish", label: "Hinglish", hint: "Hindi + English mixed, Latin script" },
] as const;

export type SpokenLanguage = (typeof languageOptions)[number]["value"];

export function isSpokenLanguage(value: unknown): value is SpokenLanguage {
  return languageOptions.some((option) => option.value === value);
}

export function normalizeLanguage(value: unknown): SpokenLanguage {
  return isSpokenLanguage(value) ? value : "auto";
}

/** ISO-639-1 hint for speech-to-text. Hinglish/auto stay unset so the model can detect. */
export function sttLanguageCode(language: SpokenLanguage): string | null {
  if (language === "english") return "en";
  if (language === "hindi") return "hi";
  return null;
}

/** Domain vocabulary + spelling hint that measurably improves recognition accuracy. */
export function sttPrompt(language: SpokenLanguage): string {
  const vocabulary =
    "Skyline Greens, Skyline Estates, Agent, Wakad, Hinjewadi, Pune, Baner, Kharadi, Balewadi, " +
    "2 BHK, 3 BHK, 4 BHK, BHK, RERA, carpet area, possession, booking amount, home loan, EMI, " +
    "lakh, lakhs, crore, crores, budget, site visit, brochure, investment, self-use, ready to move, " +
    "under construction, amenities, clubhouse, sq ft.";

  if (language === "english") {
    return `Indian English real estate sales phone call. Expect these words: ${vocabulary}`;
  }
  if (language === "hindi") {
    return `हिन्दी में रियल एस्टेट सेल्स कॉल। इन शब्दों की अपेक्षा करें: ${vocabulary}`;
  }
  if (language === "hinglish") {
    return `Hinglish (Hindi spoken with English words, written in Latin script) real estate sales phone call, e.g. "mujhe Wakad mein 3 BHK chahiye, budget 90 lakh tak hai". Expect these words: ${vocabulary}`;
  }
  return `Real estate sales phone call in India. The speaker may use Hindi, English or Hinglish, sometimes mixed in one sentence. Expect these words: ${vocabulary}`;
}

/** Extra system-prompt block telling the agent which language to speak. */
export function languageInstruction(language: SpokenLanguage): string {
  if (language === "english") {
    return "CUSTOMER LANGUAGE CHOICE: The customer chose English. Speak simple Indian English for the whole call, including the greeting. Do not switch to Hindi or Hinglish unless the customer speaks it first.";
  }
  if (language === "hindi") {
    return "CUSTOMER LANGUAGE CHOICE: The customer chose Hindi. Speak natural conversational Hindi written in Devanagari for the whole call, including the greeting. Keep common English words (BHK, budget, site visit) as-is.";
  }
  if (language === "hinglish") {
    return "CUSTOMER LANGUAGE CHOICE: The customer chose Hinglish. Speak natural Hindi-English mix written in Latin script for the whole call, including the greeting.";
  }
  return "CUSTOMER LANGUAGE CHOICE: Auto detect. Open in Hinglish, then mirror whatever language the customer uses (Hindi in Devanagari, Hinglish in Latin script, or Indian English) and follow them if they switch mid-call.";
}
