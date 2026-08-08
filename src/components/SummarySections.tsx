import { parseSummary, SUMMARY_SECTION_LABELS } from "@/lib/agent/summary";

export function SummarySections({ summary }: { summary: string | null }) {
  if (!summary?.trim()) {
    return <p className="text-sm text-muted-foreground">No summary generated for this call.</p>;
  }

  const parsed = parseSummary(summary);
  const hasSections = SUMMARY_SECTION_LABELS.some((label) => parsed[label]?.trim());

  if (!hasSections) {
    // If the summary doesn't follow the expected format, fall back to plain text.
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>;
  }

  return (
    <dl className="space-y-0.5 text-sm">
      {SUMMARY_SECTION_LABELS.map((label) => {
        const value = parsed[label]?.trim();
        return (
          <div key={label} className="flex justify-between gap-3 border-b border-border/60 py-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
              className={
                value
                  ? "max-w-[70%] text-right font-medium leading-snug"
                  : "text-right text-muted-foreground/50"
              }
            >
              {value ?? "—"}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
