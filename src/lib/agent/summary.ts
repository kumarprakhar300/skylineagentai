import type { LeadScore } from "./score";

export const SUMMARY_SECTION_LABELS = [
  "Customer profile",
  "Requirement",
  "Budget",
  "Timeline",
  "Language",
  "Sentiment",
  "Next action",
  "Lead score",
] as const;

export type SummarySectionLabel = (typeof SUMMARY_SECTION_LABELS)[number];

export type ParsedSummary = Partial<Record<SummarySectionLabel, string>>;

/**
 * Parse a formatted call summary into its labelled sections.
 * The summary is expected to contain one section per line, e.g.:
 *   "Requirement: Pune, 2 BHK, self-use"
 */
export function parseSummary(summary: string): ParsedSummary {
  const out: ParsedSummary = {};
  const labels = new Set(SUMMARY_SECTION_LABELS.map((l) => l.toLowerCase()));

  const lines = summary.split("\n");
  let currentLabel: SummarySectionLabel | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const match = line.match(/^([A-Za-z][A-Za-z ]+?):\s*(.*)$/);
    if (match) {
      const label = match[1]?.trim();
      const value = match[2]?.trim();
      if (label && value && labels.has(label.toLowerCase())) {
        const key = label as SummarySectionLabel;
        currentLabel = key;
        out[key] = value;
        continue;
      }
    }

    // Append continuation lines to the current section.
    if (currentLabel) {
      const key = currentLabel;
      out[key] = `${out[key] ?? ""}\n${line}`;
    }
  }

  return out;
}

export function summaryScoreLine(score: LeadScore): string {
  const band = score.band.replace(/^./, (c) => c.toUpperCase());
  return `Lead score: ${score.score}/100 — ${band}`;
}
