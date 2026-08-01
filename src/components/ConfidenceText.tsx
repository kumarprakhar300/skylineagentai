import { Loader2, RotateCw, ShieldCheck } from "lucide-react";

import {
  confidenceBand,
  confidencePercent,
  turnConfidence,
  type ConfidenceSegment,
} from "@/lib/agent/confidence";
import { cn } from "@/lib/utils";

/**
 * Renders transcript text with per-segment confidence shading. Low-confidence
 * segments are tappable when `onRetry` is provided, which re-transcribes the
 * turn with the high-accuracy model.
 */
export function ConfidenceText({
  text,
  segments,
  onRetry,
  retrying = false,
  tone = "muted",
}: {
  text: string;
  segments?: ConfidenceSegment[];
  onRetry?: () => void;
  retrying?: boolean;
  tone?: "muted" | "onPrimary";
}) {
  if (!segments || segments.length === 0) {
    return <span className="whitespace-pre-line">{text}</span>;
  }

  return (
    <span className="whitespace-pre-line">
      {segments.map((segment, index) => {
        const band = confidenceBand(segment.confidence);
        const pct = confidencePercent(segment.confidence);
        const title = `${pct}% transcription confidence${
          band === "high" ? "" : onRetry ? " — tap to re-transcribe" : ""
        }`;

        if (band === "high") {
          return (
            <span key={index} title={title}>
              {segment.text}{" "}
            </span>
          );
        }

        const shared = cn(
          "rounded-[4px] px-0.5 decoration-dotted underline-offset-4",
          band === "low" ? "underline decoration-2" : "underline decoration-1",
          tone === "onPrimary"
            ? band === "low"
              ? "bg-primary-foreground/20 decoration-primary-foreground"
              : "decoration-primary-foreground/60"
            : band === "low"
              ? "bg-destructive/10 decoration-destructive"
              : "decoration-muted-foreground",
        );

        return onRetry ? (
          <button
            key={index}
            type="button"
            onClick={onRetry}
            disabled={retrying}
            title={title}
            aria-label={title}
            className={cn(shared, "cursor-pointer transition hover:opacity-80")}
          >
            {segment.text}
          </button>
        ) : (
          <span key={index} className={shared} title={title}>
            {segment.text}
          </span>
        );
      })}
      {onRetry && (
        <ConfidenceFooter
          segments={segments}
          onRetry={onRetry}
          retrying={retrying}
          tone={tone}
        />
      )}
    </span>
  );
}

function ConfidenceFooter({
  segments,
  onRetry,
  retrying,
  tone,
}: {
  segments: ConfidenceSegment[];
  onRetry: () => void;
  retrying: boolean;
  tone: "muted" | "onPrimary";
}) {
  const overall = turnConfidence(segments);
  if (overall === undefined) return null;
  const band = confidenceBand(overall);

  return (
    <span
      className={cn(
        "mt-1.5 flex items-center gap-2 text-[11px]",
        tone === "onPrimary" ? "text-primary-foreground/75" : "text-muted-foreground",
      )}
    >
      <span className="inline-flex items-center gap-1 tabular-nums">
        <ShieldCheck className="size-3" />
        {confidencePercent(overall)}% confident
      </span>
      {band !== "high" && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1 rounded-full border border-current/30 px-2 py-0.5 font-semibold uppercase tracking-wide transition hover:opacity-80 disabled:opacity-60"
        >
          {retrying ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RotateCw className="size-3" />
          )}
          Re-transcribe
        </button>
      )}
    </span>
  );
}

/** Compact confidence chip for read-only transcript views. */
export function ConfidenceChip({
  segments,
  refined,
  className,
}: {
  segments?: ConfidenceSegment[];
  refined?: boolean;
  className?: string;
}) {
  const overall = turnConfidence(segments);
  if (overall === undefined) return null;
  const band = confidenceBand(overall);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        band === "low"
          ? "bg-destructive/15 text-destructive"
          : band === "medium"
            ? "bg-muted text-muted-foreground"
            : "bg-muted/60 text-muted-foreground",
        className,
      )}
      title={refined ? "Re-transcribed with the high-accuracy model" : "Transcription confidence"}
    >
      {confidencePercent(overall)}%{refined ? " ✓" : ""}
    </span>
  );
}
