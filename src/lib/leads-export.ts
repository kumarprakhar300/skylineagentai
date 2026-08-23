import { parseSummary, SUMMARY_SECTION_LABELS } from "@/lib/agent/summary";
import { downloadCsv, stamp, toCsv } from "@/lib/csv";
import type { CallRow, LeadRow } from "@/lib/leads-types";
import {
  explainScoreReasons,
  formatScoreBreakdown,
  SCORE_SIGNALS,
  signalDetail,
  signalPoints,
} from "@/lib/score-breakdown";

export type ExportColumn = {
  key: string;
  label: string;
  group: "Call" | "Lead" | "Requirements" | "Score" | "Score breakdown" | "Summary sections" | "Pipeline";
  value: (call: CallRow, lead: LeadRow | undefined) => unknown;
};

const sectionColumns: ExportColumn[] = SUMMARY_SECTION_LABELS.map((label) => ({
  key: `section:${label}`,
  label: `Summary — ${label}`,
  group: "Summary sections" as const,
  value: (call) => parseSummary(call.summary ?? "")[label],
}));

const breakdownColumns: ExportColumn[] = SCORE_SIGNALS.flatMap((signal) => [
  {
    key: `signal:${signal}:points`,
    label: `${signal} points`,
    group: "Score breakdown" as const,
    value: (_c: CallRow, l: LeadRow | undefined) => signalPoints(l?.score_reasons, signal),
  },
  {
    key: `signal:${signal}:detail`,
    label: `${signal} signal`,
    group: "Score breakdown" as const,
    value: (_c: CallRow, l: LeadRow | undefined) => signalDetail(l?.score_reasons, signal),
  },
]);

/** Every column a user can pick for the leads CSV export. */
export const LEAD_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "date", label: "Call date", group: "Call", value: (c) => new Date(c.started_at).toLocaleString("en-IN") },
  { key: "channel", label: "Channel", group: "Call", value: (c) => c.channel },
  { key: "language", label: "Language", group: "Call", value: (c) => c.language },
  { key: "call_id", label: "Call ID", group: "Call", value: (c) => c.id },
  { key: "turns", label: "Transcript turns", group: "Call", value: (c) => (c.transcript ?? []).length },
  { key: "summary", label: "Call summary (full)", group: "Call", value: (c) => c.summary },
  {
    key: "summary_recap",
    label: "Call summary recap",
    group: "Call",
    // Sectioned recap, one "Label: value" per line so it reads cleanly in a wrapped cell.
    value: (c) => {
      const parsed = parseSummary(c.summary ?? "");
      return SUMMARY_SECTION_LABELS.filter((label) => parsed[label])
        .map((label) => `${label}: ${(parsed[label] ?? "").replace(/\n+/g, " ").trim()}`)
        .join("\n");
    },
  },
  {
    key: "summary_oneline",
    label: "Call summary (one line)",
    group: "Call",
    value: (c) => (c.summary ?? "").replace(/\s*\n+\s*/g, " · ").trim(),
  },

  { key: "name", label: "Name", group: "Lead", value: (_c, l) => l?.name },
  { key: "phone", label: "Phone", group: "Lead", value: (_c, l) => l?.phone },
  { key: "intent", label: "Buy / invest", group: "Lead", value: (_c, l) => l?.intent },

  { key: "location", label: "Location", group: "Requirements", value: (_c, l) => l?.location },
  { key: "property_type", label: "Property type", group: "Requirements", value: (_c, l) => l?.property_type },
  { key: "configuration", label: "Configuration", group: "Requirements", value: (_c, l) => l?.configuration },
  { key: "budget", label: "Budget", group: "Requirements", value: (_c, l) => l?.budget },
  { key: "purpose", label: "Purpose", group: "Requirements", value: (_c, l) => l?.purpose },
  { key: "timeline", label: "Timeline", group: "Requirements", value: (_c, l) => l?.timeline },

  { key: "score", label: "Lead score", group: "Score", value: (_c, l) => l?.score },
  { key: "score_band", label: "Score band", group: "Score", value: (_c, l) => l?.score_band },
  { key: "score_reasons", label: "Score signals", group: "Score", value: (_c, l) => l?.score_reasons },
  {
    key: "score_breakdown",
    label: "Score breakdown",
    group: "Score",
    value: (_c, l) => formatScoreBreakdown(l?.score_reasons),
  },
  {
    key: "score_explanation",
    label: "Score explanation",
    group: "Score",
    // One signal per line so the cell reads like a list in Excel / Sheets.
    value: (_c, l) =>
      explainScoreReasons(l?.score_reasons)
        .map((e) => `${e.signal} ${e.points >= 0 ? "+" : ""}${e.points}: ${e.explanation}`)
        .join("\n"),
  },


  { key: "status", label: "Pipeline status", group: "Pipeline", value: (_c, l) => l?.status },
  { key: "owner_notes", label: "Owner notes", group: "Pipeline", value: (_c, l) => l?.owner_notes },
  {
    key: "callback_at",
    label: "Callback at",
    group: "Pipeline",
    value: (_c, l) => (l?.callback_at ? new Date(l.callback_at).toLocaleString("en-IN") : ""),
  },

  ...breakdownColumns,
  ...sectionColumns,
];

/** Columns selected by default — the classic export shape. */
export const DEFAULT_EXPORT_COLUMN_KEYS = [
  "date",
  "channel",
  "language",
  "name",
  "phone",
  "intent",
  "location",
  "property_type",
  "configuration",
  "budget",
  "purpose",
  "timeline",
  "score",
  "score_band",
  "score_reasons",
  "score_breakdown",
  "summary_recap",
  "summary",
];

/** Build a call-level CSV containing only the chosen columns, in registry order. */
export function buildLeadsCsv(
  calls: CallRow[],
  leadByCall: Map<string, LeadRow>,
  columnKeys: string[] = DEFAULT_EXPORT_COLUMN_KEYS,
): string {
  const selected = LEAD_EXPORT_COLUMNS.filter((c) => columnKeys.includes(c.key));
  const columns = selected.length > 0 ? selected : LEAD_EXPORT_COLUMNS;
  return toCsv(
    columns.map((c) => c.label),
    calls.map((call) => {
      const lead = leadByCall.get(call.id);
      return columns.map((c) => c.value(call, lead));
    }),
  );
}

/** Build a turn-level CSV: one row per transcript turn across the given calls. */
export function buildTranscriptsCsv(calls: CallRow[], leadByCall: Map<string, LeadRow>): string {
  const rows: unknown[][] = [];
  calls.forEach((call) => {
    const lead = leadByCall.get(call.id);
    (call.transcript ?? []).forEach((turn, index) => {
      rows.push([
        call.id,
        new Date(call.started_at).toLocaleString("en-IN"),
        lead?.name,
        lead?.phone,
        index + 1,
        turn.role === "user" ? "Customer" : "Agent",
        turn.content,
      ]);
    });
  });
  return toCsv(
    ["Call ID", "Call date", "Name", "Phone", "Turn", "Speaker", "Message"],
    rows,
  );
}

export function leadByCallMap(leads: LeadRow[]): Map<string, LeadRow> {
  const map = new Map<string, LeadRow>();
  leads.forEach((lead) => {
    if (lead.call_id) map.set(lead.call_id, lead);
  });
  return map;
}

export function downloadLeadsCsv(
  calls: CallRow[],
  leadByCall: Map<string, LeadRow>,
  columnKeys: string[] = DEFAULT_EXPORT_COLUMN_KEYS,
) {
  downloadCsv(`leads-${stamp()}.csv`, buildLeadsCsv(calls, leadByCall, columnKeys));
}

export function downloadTranscriptsCsv(calls: CallRow[], leadByCall: Map<string, LeadRow>) {
  downloadCsv(`call-transcripts-${stamp()}.csv`, buildTranscriptsCsv(calls, leadByCall));
}
