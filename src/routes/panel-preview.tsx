import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LeadDetailPanel } from "@/components/LeadDetailPanel";
import { Button } from "@/components/ui/button";
import type { CallRow, LeadRow } from "@/lib/leads-types";

const call: CallRow = {
  id: "c1",
  channel: "browser",
  language: "hinglish",
  summary:
    "Caller Rohit Sharma is looking for a 3 BHK in Wakad for end use, budget 1.4-1.6 Cr, wants possession within 6 months and asked for a site visit this Sunday.",
  transcript: [
    { role: "assistant", content: "Namaste! Main Aarav bol raha hoon Skyline Greens se." },
    { role: "user", content: "Haan, mujhe Wakad mein 3 BHK dekhna hai." },
    { role: "assistant", content: "Perfect. Budget range kya rakhi hai aapne?" },
    { role: "user", content: "1.4 se 1.6 crore tak, investment nahi, rehne ke liye." },
  ],
  started_at: new Date().toISOString(),
};

const lead: LeadRow = {
  id: "l1",
  call_id: "c1",
  name: "Rohit Sharma",
  phone: "+91 98200 11223",
  intent: "buy",
  location: "Wakad, Pune",
  property_type: "apartment",
  configuration: "3 BHK",
  budget: "1.4-1.6 Cr",
  purpose: "end use",
  timeline: "within 6 months",
  score: 86,
  score_band: "hot",
  score_reasons: ["Budget and location captured", "Timeline within 6 months", "Asked for a site visit"],
  status: "contacted",
  owner_notes: "Prefers evening calls.",
  callback_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

export const Route = createFileRoute("/panel-preview")({
  component: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className="p-10">
        <Button onClick={() => setOpen(true)}>Open details</Button>
        <LeadDetailPanel
          open={open}
          onOpenChange={setOpen}
          call={call}
          lead={lead}
          highlight="Wakad"
          onSaveLead={async () => true}
        />
      </div>
    );
  },
});
