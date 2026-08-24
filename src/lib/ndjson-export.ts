import { parseSummary, SUMMARY_SECTION_LABELS } from "@/lib/agent/summary";
import { stamp } from "@/lib/csv";
import type { CallRow, LeadRow } from "@/lib/leads-types";
import { explainScoreReasons, formatScoreBreakdown } from "@/lib/score-breakdown";

/** One JSON object per line — stable, machine-friendly shape for downstream pipelines. */
export type LeadNdjsonRecord = {
  call: {
    id: string;
    started_at: string;
    channel: string | null;
    language: string | null;
    turns: number;
  };
  lead: {
    name: string | null;
    phone: string | null;
    intent: string | null;
  };
  requirements: {
    location: string | null;
    property_type: string | null;
    configuration: string | null;
    budget: string | null;
    purpose: string | null;
    timeline: string | null;
    complete: boolean;
  };
  score: {
    value: number | null;
    band: string | null;
    signals: unknown;
    breakdown: string;
    explanation: { signal: string; points: number; explanation: string }[];
  };
  summary: {
    text: string | null;
    sections: Record<string, string | undefined>;
  };
  pipeline: {
    status: string | null;
    owner_notes: string | null;
    callback_at: string | null;
  };
  transcript?: { turn: number; speaker: "Customer" | "Agent"; message: string }[];
};

const nullish = (value: unknown): string | null =>
  value === undefined || value === "" ? null : (value as string | null);

export function buildLeadRecord(
  call: CallRow,
  lead: LeadRow | undefined,
  includeTranscript = false,
): LeadNdjsonRecord {
  const parsed = parseSummary(call.summary ?? "");
  const sections: Record<string, string | undefined> = {};
  SUMMARY_SECTION_LABELS.forEach((label) => {
    if (parsed[label]) sections[label] = parsed[label];
  });

  const requirements = {
    location: nullish(lead?.location),
    property_type: nullish(lead?.property_type),
    configuration: nullish(lead?.configuration),
    budget: nullish(lead?.budget),
    purpose: nullish(lead?.purpose),
    timeline: nullish(lead?.timeline),
  };

  const record: LeadNdjsonRecord = {
    call: {
      id: call.id,
      started_at: call.started_at,
      channel: nullish(call.channel),
      language: nullish(call.language),
      turns: (call.transcript ?? []).length,
    },
    lead: {
      name: nullish(lead?.name),
      phone: nullish(lead?.phone),
      intent: nullish(lead?.intent),
    },
    requirements: {
      ...requirements,
      complete: Object.values(requirements).every((v) => v !== null),
    },
    score: {
      value: lead?.score ?? null,
      band: nullish(lead?.score_band),
      signals: lead?.score_reasons ?? null,
      breakdown: formatScoreBreakdown(lead?.score_reasons),
      explanation: explainScoreReasons(lead?.score_reasons),
    },
    summary: {
      text: nullish(call.summary),
      sections,
    },
    pipeline: {
      status: nullish(lead?.status),
      owner_notes: nullish(lead?.owner_notes),
      callback_at: lead?.callback_at ?? null,
    },
  };

  if (includeTranscript) {
    record.transcript = (call.transcript ?? []).map((turn, index) => ({
      turn: index + 1,
      speaker: turn.role === "user" ? "Customer" : "Agent",
      message: turn.content,
    }));
  }

  return record;
}

/** NDJSON: newline-delimited JSON, one lead record per line. */
export function buildLeadsNdjson(
  calls: CallRow[],
  leadByCall: Map<string, LeadRow>,
  includeTranscript = false,
): string {
  return calls
    .map((call) => JSON.stringify(buildLeadRecord(call, leadByCall.get(call.id), includeTranscript)))
    .join("\n");
}

export function downloadLeadsNdjson(
  calls: CallRow[],
  leadByCall: Map<string, LeadRow>,
  includeTranscript = false,
) {
  const blob = new Blob([`${buildLeadsNdjson(calls, leadByCall, includeTranscript)}\n`], {
    type: "application/x-ndjson;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-${stamp()}.ndjson`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
