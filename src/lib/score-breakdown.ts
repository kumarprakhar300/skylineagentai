/**
 * Turns the stored `score_reasons` signals into a per-signal breakdown so an
 * export can show WHY a lead landed in the Hot / Warm / Cold band.
 *
 * The point values mirror the deterministic rules in `src/lib/agent/score.ts`.
 */

export const SCORE_SIGNALS = [
  "Requirements",
  "Contact",
  "Timeline",
  "Budget",
  "Purpose",
  "Engagement",
  "Buying signals",
] as const;

export type ScoreSignal = (typeof SCORE_SIGNALS)[number];

type Rule = { signal: ScoreSignal; test: RegExp; points: (reason: string) => number };

const RULES: Rule[] = [
  {
    signal: "Requirements",
    test: /requirement fields captured/i,
    points: (reason) => {
      const match = reason.match(/(\d+)\s*\/\s*(\d+)/);
      if (!match) return 0;
      return Math.round((Number(match[1]) / Number(match[2])) * 35);
    },
  },
  { signal: "Contact", test: /shared a contact number/i, points: () => 15 },
  { signal: "Contact", test: /no contact number/i, points: () => 0 },
  { signal: "Contact", test: /shared their name/i, points: () => 5 },

  { signal: "Timeline", test: /timeline is immediate/i, points: () => 20 },
  { signal: "Timeline", test: /timeline within a few months/i, points: () => 12 },
  { signal: "Timeline", test: /timeline is a year or more/i, points: () => 0 },
  { signal: "Timeline", test: /timeline captured/i, points: () => 6 },

  { signal: "Budget", test: /budget in crores/i, points: () => 12 },
  { signal: "Budget", test: /budget matches the project/i, points: () => 10 },
  { signal: "Budget", test: /budget indicated/i, points: () => 5 },

  { signal: "Purpose", test: /self-use/i, points: () => 5 },
  { signal: "Purpose", test: /investment buyer/i, points: () => 4 },

  { signal: "Engagement", test: /long, engaged conversation/i, points: () => 8 },
  { signal: "Engagement", test: /moderate engagement/i, points: () => 4 },
  { signal: "Engagement", test: /very short conversation/i, points: () => 0 },

  { signal: "Buying signals", test: /site visit \/ pricing \/ booking/i, points: () => 12 },
  { signal: "Buying signals", test: /disinterest|contacted later/i, points: () => -20 },
];

export type SignalBreakdown = {
  signal: ScoreSignal;
  points: number;
  reasons: string[];
};

/** Group stored score reasons by signal, with the points each contributed. */
export function breakdownScoreReasons(reasons: string[] | null | undefined): SignalBreakdown[] {
  const map = new Map<ScoreSignal, SignalBreakdown>(
    SCORE_SIGNALS.map((signal) => [signal, { signal, points: 0, reasons: [] }]),
  );

  (reasons ?? []).forEach((reason) => {
    const rule = RULES.find((r) => r.test.test(reason));
    if (!rule) return;
    const entry = map.get(rule.signal)!;
    entry.points += rule.points(reason);
    entry.reasons.push(reason);
  });

  return SCORE_SIGNALS.map((signal) => map.get(signal)!);
}

/** "Timeline +20; Budget +10; Buying signals -20" — compact single-cell view. */
export function formatScoreBreakdown(reasons: string[] | null | undefined): string {
  return breakdownScoreReasons(reasons)
    .filter((entry) => entry.reasons.length > 0)
    .map((entry) => `${entry.signal} ${entry.points >= 0 ? "+" : ""}${entry.points}`)
    .join("; ");
}

export function signalPoints(reasons: string[] | null | undefined, signal: ScoreSignal): number | "" {
  const entry = breakdownScoreReasons(reasons).find((e) => e.signal === signal)!;
  return entry.reasons.length > 0 ? entry.points : "";
}

export function signalDetail(reasons: string[] | null | undefined, signal: ScoreSignal): string {
  const entry = breakdownScoreReasons(reasons).find((e) => e.signal === signal)!;
  return entry.reasons.join("; ");
}

/** Plain-English meaning of each signal, used in the export dialog explanation. */
const SIGNAL_MEANING: Record<ScoreSignal, string> = {
  Requirements: "how much of the qualification checklist the agent captured (up to +35)",
  Contact: "sharing a phone number (+15) and a name (+5)",
  Timeline: "how soon they want to buy — immediate +20, a few months +12, a year away +0",
  Budget: "whether the stated budget fits the project range — crores +12, matching +10, vague +5",
  Purpose: "self-use (+5) or investment (+4) intent",
  Engagement: "how much the customer actually talked — long +8, moderate +4, very short +0",
  "Buying signals": "asking for a site visit, price list or booking (+12); disinterest or 'call later' (-20)",
};

export type SignalExplanation = SignalBreakdown & { explanation: string };

/**
 * Human-readable "why" for every signal that fired, e.g.
 * "Timeline +20 — Timeline is immediate. Counts how soon they want to buy…".
 */
export function explainScoreReasons(reasons: string[] | null | undefined): SignalExplanation[] {
  return breakdownScoreReasons(reasons)
    .filter((entry) => entry.reasons.length > 0)
    .map((entry) => {
      const direction =
        entry.points > 0 ? "increased the score" : entry.points < 0 ? "lowered the score" : "did not change the score";
      return {
        ...entry,
        explanation: `${entry.reasons.join("; ")} — this ${direction} because it scores ${SIGNAL_MEANING[entry.signal]}.`,
      };
    });
}

export function signalMeaning(signal: ScoreSignal): string {
  return SIGNAL_MEANING[signal];
}
