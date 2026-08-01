import { Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";

type Role = "user" | "assistant" | string;

/** Display identity for each side of the conversation. */
export function speakerName(role: Role): string {
  return role === "user" ? "Customer" : "Agent";
}

export function speakerShortName(role: Role): string {
  return role === "user" ? "Customer" : "Agent";
}

/**
 * Speaker chip shown above a transcript bubble: avatar + name + optional turn number.
 * `tone="onPrimary"` is for filled bubbles where the text sits on the primary colour.
 */
export function SpeakerLabel({
  role,
  turnNumber,
  tone = "muted",
  className,
}: {
  role: Role;
  turnNumber?: number;
  tone?: "muted" | "onPrimary";
  className?: string;
}) {
  const isCustomer = role === "user";
  const Icon = isCustomer ? User : Bot;

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "onPrimary" ? "text-primary-foreground/75" : "text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full",
          tone === "onPrimary"
            ? "bg-primary-foreground/20 text-primary-foreground"
            : isCustomer
              ? "bg-primary/15 text-primary"
              : "bg-accent/20 text-accent-foreground",
        )}
      >
        <Icon className="size-2.5" />
      </span>
      <span className="truncate">{speakerName(role)}</span>
      {turnNumber !== undefined && (
        <span className="font-normal tabular-nums opacity-60">#{turnNumber}</span>
      )}
    </span>
  );
}
