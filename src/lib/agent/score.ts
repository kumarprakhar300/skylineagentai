import type { LeadFields, Turn } from "./prompt";

export type LeadScore = {
  score: number;
  band: "hot" | "warm" | "cold";
  reasons: string[];
};

const CORE_FIELDS: (keyof LeadFields)[] = [
  "intent",
  "location",
  "property_type",
  "configuration",
  "budget",
  "purpose",
  "timeline",
];

const URGENT = /(immediate|urgent|asap|abhi|turant|this month|is month|30 day|1 month|ek month|next month|agle month|15 day|ready to move|ready possession)/i;
const NEAR_TERM = /(2 month|3 month|do month|teen month|quarter|60 day|90 day|soon|jaldi|festive|diwali)/i;
const LONG_TERM = /(next year|agle saal|1 year|ek saal|2 year|do saal|later|baad me|baad mein|no rush|planning only|just looking|dekh rahe)/i;

const HIGH_BUDGET = /(\b[1-9]\d*\s*(cr|crore|karod)\b)/i;
const MID_BUDGET = /(\b(7[0-9]|[89]\d)\s*(l|lac|lakh|lakhs)\b|\b1\s*(cr|crore)\b)/i;

const HOT_SIGNALS = /(site visit|visit kar|dekhne aa|book|booking|token|loan approved|pre-?approved|home loan sanction|brochure|price list|cost sheet|kab aa sakte|available kab)/i;
const COLD_SIGNALS = /(not interested|interested nahi|mat call|do not call|busy|later call|abhi nahi|wrong number|galat number|just checking|time pass)/i;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Deterministic lead scoring. Runs at the end of every call (browser or phone)
 * so the same rules apply to both channels and the score is reproducible.
 */
export function scoreLead(lead: Partial<LeadFields>, transcript: Turn[]): LeadScore {
  const reasons: string[] = [];
  let score = 0;

  const captured = CORE_FIELDS.filter((f) => Boolean(lead[f]));
  const completeness = Math.round((captured.length / CORE_FIELDS.length) * 35);
  score += completeness;
  reasons.push(`${captured.length}/${CORE_FIELDS.length} requirement fields captured`);

  if (lead.phone) {
    score += 15;
    reasons.push("Shared a contact number");
  } else {
    reasons.push("No contact number shared");
  }
  if (lead.name) {
    score += 5;
    reasons.push("Shared their name");
  }

  const timeline = lead.timeline ?? "";
  if (URGENT.test(timeline)) {
    score += 20;
    reasons.push("Timeline is immediate");
  } else if (NEAR_TERM.test(timeline)) {
    score += 12;
    reasons.push("Timeline within a few months");
  } else if (LONG_TERM.test(timeline)) {
    reasons.push("Timeline is a year or more away");
  } else if (timeline) {
    score += 6;
    reasons.push("Timeline captured");
  }

  const budget = lead.budget ?? "";
  if (HIGH_BUDGET.test(budget)) {
    score += 12;
    reasons.push("Budget in crores — above project range");
  } else if (MID_BUDGET.test(budget)) {
    score += 10;
    reasons.push("Budget matches the project price range");
  } else if (budget) {
    score += 5;
    reasons.push("Budget indicated");
  }

  if ((lead.purpose ?? "").match(/self|khud|rehne|family|end use/i)) {
    score += 5;
    reasons.push("Buying for self-use");
  } else if ((lead.purpose ?? "").match(/invest|nivesh|rental/i)) {
    score += 4;
    reasons.push("Investment buyer");
  }

  const customerTurns = transcript.filter((t) => t.role === "user");
  const customerText = customerTurns.map((t) => t.content).join(" ");

  if (customerTurns.length >= 6) {
    score += 8;
    reasons.push("Long, engaged conversation");
  } else if (customerTurns.length >= 3) {
    score += 4;
    reasons.push("Moderate engagement");
  } else {
    reasons.push("Very short conversation");
  }

  if (HOT_SIGNALS.test(customerText)) {
    score += 12;
    reasons.push("Asked about site visit / pricing / booking");
  }
  if (COLD_SIGNALS.test(customerText)) {
    score -= 20;
    reasons.push("Expressed disinterest or asked to be contacted later");
  }

  score = clamp(Math.round(score), 0, 100);
  const band: LeadScore["band"] = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

  return { score, band, reasons };
}

export function scoreLine(result: LeadScore): string {
  const label = result.band === "hot" ? "Hot lead" : result.band === "warm" ? "Warm lead" : "Cold lead";
  return `Lead score: ${result.score}/100 — ${label}. Signals: ${result.reasons.join("; ")}.`;
}
