import type { Turn } from "@/lib/agent/prompt";

export type LeadRow = {
  id: string;
  call_id: string | null;
  name: string | null;
  phone: string | null;
  intent: string | null;
  location: string | null;
  property_type: string | null;
  configuration: string | null;
  budget: string | null;
  purpose: string | null;
  timeline: string | null;
  score: number | null;
  score_band: string | null;
  score_reasons: string[] | null;
  status: string | null;
  owner_notes: string | null;
  callback_at: string | null;
  created_at: string;
};

export type CallRow = {
  id: string;
  channel: string;
  language: string | null;
  summary: string | null;
  transcript: Turn[] | null;
  started_at: string;
};

export type LeadPatch = {
  status: string;
  owner_notes: string | null;
  callback_at: string | null;
};
