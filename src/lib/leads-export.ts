import { downloadCsv, stamp, toCsv } from "@/lib/csv";
import type { CallRow, LeadRow } from "@/lib/leads-types";

/** Build a call-level CSV: one row per call with its qualified lead fields. */
export function buildLeadsCsv(calls: CallRow[], leadByCall: Map<string, LeadRow>): string {
  return toCsv(
    [
      "Call date",
      "Channel",
      "Language",
      "Name",
      "Phone",
      "Buy / invest",
      "Location",
      "Property type",
      "Configuration",
      "Budget",
      "Purpose",
      "Timeline",
      "Lead score",
      "Score band",
      "Score signals",
      "Call summary",
    ],
    calls.map((call) => {
      const lead = leadByCall.get(call.id);
      return [
        new Date(call.started_at).toLocaleString("en-IN"),
        call.channel,
        call.language,
        lead?.name,
        lead?.phone,
        lead?.intent,
        lead?.location,
        lead?.property_type,
        lead?.configuration,
        lead?.budget,
        lead?.purpose,
        lead?.timeline,
        lead?.score,
        lead?.score_band,
        lead?.score_reasons,
        call.summary,
      ];
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

export function downloadLeadsCsv(calls: CallRow[], leadByCall: Map<string, LeadRow>) {
  downloadCsv(`leads-${stamp()}.csv`, buildLeadsCsv(calls, leadByCall));
}

export function downloadTranscriptsCsv(calls: CallRow[], leadByCall: Map<string, LeadRow>) {
  downloadCsv(`call-transcripts-${stamp()}.csv`, buildTranscriptsCsv(calls, leadByCall));
}
