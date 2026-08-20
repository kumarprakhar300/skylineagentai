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
