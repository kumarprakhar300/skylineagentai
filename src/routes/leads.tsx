import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type LeadsSearch = {
  q: string;
  location: string;
  budget: string;
  from: string;
  to: string;
};

const ALL = "all";

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const Route = createFileRoute("/leads")({
  validateSearch: (search: Record<string, unknown>): LeadsSearch => ({
    q: str(search['q']),
    location: str(search['location']) || ALL,
    budget: str(search['budget']) || ALL,
    from: str(search['from']),
    to: str(search['to']),
  }),
  head: () => ({
    meta: [
      { title: "Captured Leads & Call Summaries — Skyline Estates AI Agent" },
      {
        name: "description",
        content:
          "Search and filter every AI voice call by location, budget and date — with the qualified requirement, full transcript and AI-generated call summary.",
      },
      { property: "og:title", content: "Captured leads & call summaries" },
      {
        property: "og:description",
        content: "Search transcripts and filter qualified real estate leads by location, budget and date.",
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

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== ""))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function Leads() {
  const { data } = useSuspenseQuery(leadsQuery);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setSearch = (patch: Partial<LeadsSearch>) =>
    navigate({ search: (prev: LeadsSearch) => ({ ...prev, ...patch }) });

  const leadByCall = new Map(data.leads.filter((l) => l.call_id).map((l) => [l.call_id!, l]));

  const locations = uniqueSorted(data.leads.map((l) => l.location));
  const budgets = uniqueSorted(data.leads.map((l) => l.budget));

  const q = search.q.trim().toLowerCase();
  const fromTime = search.from ? new Date(`${search.from}T00:00:00`).getTime() : null;
  const toTime = search.to ? new Date(`${search.to}T23:59:59`).getTime() : null;

  const filtered = data.calls.filter((call) => {
    const lead = leadByCall.get(call.id);

    if (search.location !== ALL && (lead?.location ?? "") !== search.location) return false;
    if (search.budget !== ALL && (lead?.budget ?? "") !== search.budget) return false;

    const started = new Date(call.started_at).getTime();
    if (fromTime !== null && started < fromTime) return false;
    if (toTime !== null && started > toTime) return false;

    if (q) {
      const haystack = [
        call.summary,
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
        ...(Array.isArray(call.transcript) ? call.transcript.map((t) => t.content) : []),
      ]
        .filter(Boolean)
        .join(" \n ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  const hasFilters =
    !!search.q || search.location !== ALL || search.budget !== ALL || !!search.from || !!search.to;

  return (
    <Shell>
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Label htmlFor="lead-search" className="text-xs text-muted-foreground">
              Search transcripts &amp; summaries
            </Label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lead-search"
                value={search.q}
                onChange={(e) => setSearch({ q: e.target.value })}
                placeholder="e.g. Wakad, 3 BHK, investment"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Select value={search.location} onValueChange={(v) => setSearch({ location: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Budget</Label>
            <Select value={search.budget} onValueChange={(v) => setSearch({ budget: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All budgets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All budgets</SelectItem>
                {budgets.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="from"
                type="date"
                className="mt-1.5"
                value={search.from}
                onChange={(e) => setSearch({ from: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="to"
                type="date"
                className="mt-1.5"
                value={search.to}
                onChange={(e) => setSearch({ to: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {data.calls.length} calls
          </p>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSearch({ q: "", location: ALL, budget: ALL, from: "", to: "" })
              }
            >
              <X className="size-4" /> Clear filters
            </Button>
          )}
        </div>
      </Card>

      {data.calls.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No calls recorded yet. Start a call on the demo page and end it — the lead and summary
          will appear here.
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No calls match these filters. Try clearing the search or widening the date range.
        </Card>
      ) : (
        filtered.map((call) => {
          const lead = leadByCall.get(call.id);
          const matchingTurns = q
            ? (call.transcript ?? []).filter((t) => t.content.toLowerCase().includes(q))
            : [];
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

              {matchingTurns.length > 0 && (
                <div className="mt-5 rounded-md border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {matchingTurns.length} transcript match
                    {matchingTurns.length === 1 ? "" : "es"}
                  </p>
                  <div className="mt-2 space-y-1.5 text-sm">
                    {matchingTurns.slice(0, 3).map((turn, index) => (
                      <p key={index}>
                        <span className="font-semibold">
                          {turn.role === "user" ? "Customer" : "Aarav"}:
                        </span>{" "}
                        <span className="text-muted-foreground">{turn.content}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

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
        })
      )}
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
