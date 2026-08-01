import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Turn } from "@/lib/agent/prompt";

type LeadRow = {
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
  created_at: string;
};

type CallRow = {
  id: string;
  channel: string;
  language: string | null;
  summary: string | null;
  transcript: Turn[] | null;
  started_at: string;
};

const leadsQuery = queryOptions({
  queryKey: ["leads"],
  queryFn: async () => {
    const [leads, calls] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("calls").select("*").order("started_at", { ascending: false }).limit(100),
    ]);
    if (leads.error) throw leads.error;
    if (calls.error) throw calls.error;
    return {
      leads: (leads.data ?? []) as unknown as LeadRow[],
      calls: (calls.data ?? []) as unknown as CallRow[],
    };
  },
});

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Captured Leads & Call Summaries — Skyline Estates AI Agent" },
      {
        name: "description",
        content:
          "Every AI voice call stored with the qualified requirement, detected language, full transcript and AI-generated call summary.",
      },
      { property: "og:title", content: "Captured leads & call summaries" },
      {
        property: "og:description",
        content: "Where the AI calling agent stores qualified real estate leads and call summaries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Leads,
  errorComponent: ({ error }) => (
    <Shell>
      <Card className="p-6 text-sm">
        Could not load leads: {error instanceof Error ? error.message : "unknown error"}
      </Card>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to the call demo
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Leads &amp; call records</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every completed call is stored with its transcript, detected language, extracted
          requirement and AI-written summary.
        </p>
        <div className="mt-8 space-y-5">{children}</div>
      </div>
    </main>
  );
}

function Leads() {
  const { data } = useSuspenseQuery(leadsQuery);
  const leadByCall = new Map(data.leads.filter((l) => l.call_id).map((l) => [l.call_id!, l]));

  if (data.calls.length === 0) {
    return (
      <Shell>
        <Card className="p-6 text-sm text-muted-foreground">
          No calls recorded yet. Start a call on the demo page and end it — the lead and summary
          will appear here.
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      {data.calls.map((call) => {
        const lead = leadByCall.get(call.id);
        return (
          <Card key={call.id} className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{call.channel}</Badge>
              {call.language && <Badge variant="outline">{call.language}</Badge>}
              <span className="text-xs text-muted-foreground">
                {new Date(call.started_at).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lead captured
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <Row label="Name" value={lead?.name} />
                  <Row label="Phone" value={lead?.phone} />
                  <Row label="Buy / invest" value={lead?.intent} />
                  <Row label="Location" value={lead?.location} />
                  <Row label="Property type" value={lead?.property_type} />
                  <Row label="Configuration" value={lead?.configuration} />
                  <Row label="Budget" value={lead?.budget} />
                  <Row label="Purpose" value={lead?.purpose} />
                  <Row label="Timeline" value={lead?.timeline} />
                </dl>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  AI call summary
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {call.summary || "—"}
                </p>
              </div>
            </div>

            {Array.isArray(call.transcript) && call.transcript.length > 0 && (
              <details className="mt-5">
                <summary className="cursor-pointer text-sm font-medium">
                  View transcript ({call.transcript.length} turns)
                </summary>
                <div className="mt-3 space-y-2 text-sm">
                  {call.transcript.map((turn, index) => (
                    <p key={index}>
                      <span className="font-semibold">
                        {turn.role === "user" ? "Customer" : "Aarav"}:
                      </span>{" "}
                      <span className="text-muted-foreground">{turn.content}</span>
                    </p>
                  ))}
                </div>
              </details>
            )}
          </Card>
        );
      })}
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value ? "font-medium" : "text-muted-foreground/50"}>{value ?? "—"}</dd>
    </div>
  );
}
