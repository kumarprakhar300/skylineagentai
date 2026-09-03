import type { LeadRow } from "@/lib/leads-types";

/** The six qualification fields the agent tries to capture on every call. */
export const REQUIREMENT_FIELDS = [
  "location",
  "property_type",
  "configuration",
  "budget",
  "purpose",
  "timeline",
] as const;

export type RequirementField = (typeof REQUIREMENT_FIELDS)[number];

export const REQUIREMENT_LABELS: Record<RequirementField, string> = {
  location: "Location",
  property_type: "Property type",
  configuration: "Configuration",
  budget: "Budget",
  purpose: "Purpose",
  timeline: "Timeline",
};

export function capturedRequirements(lead: LeadRow | undefined): RequirementField[] {
  if (!lead) return [];
  return REQUIREMENT_FIELDS.filter((f) => {
    const value = lead[f];
    return typeof value === "string" && value.trim() !== "";
  });
}

export function missingRequirements(lead: LeadRow | undefined): RequirementField[] {
  const captured = new Set(capturedRequirements(lead));
  return REQUIREMENT_FIELDS.filter((f) => !captured.has(f));
}

export type RequirementBucket = "complete" | "partial" | "empty";

/** Buckets a lead by how much of the requirement set was qualified. */
export function requirementBucket(lead: LeadRow | undefined): RequirementBucket {
  const count = capturedRequirements(lead).length;
  if (count === REQUIREMENT_FIELDS.length) return "complete";
  if (count === 0) return "empty";
  return "partial";
}

export const REQUIREMENT_BUCKETS: { value: RequirementBucket; label: string }[] = [
  { value: "complete", label: "All requirements captured" },
  { value: "partial", label: "Partly qualified" },
  { value: "empty", label: "No requirements yet" },
];

export type ScoreBand = "hot" | "warm" | "cold";

export const SCORE_BANDS: { value: ScoreBand; label: string; tone: string }[] = [
  {
    value: "hot",
    label: "Hot (70+)",
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  { value: "warm", label: "Warm (40-69)", tone: "border-primary/40 bg-primary/10 text-primary" },
  {
    value: "cold",
    label: "Cold (<40)",
    tone: "border-border bg-secondary/60 text-muted-foreground",
  },
];

export function leadBand(lead: LeadRow | undefined): ScoreBand {
  const band = lead?.score_band;
  return band === "hot" || band === "warm" ? band : "cold";
}

export function bandTone(band: ScoreBand): string {
  return SCORE_BANDS.find((b) => b.value === band)?.tone ?? "";
}
