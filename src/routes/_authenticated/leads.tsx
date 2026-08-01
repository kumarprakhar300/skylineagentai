import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, PanelRight, PhoneCall, Search, SearchX, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { LeadDetailPanel } from "@/components/LeadDetailPanel";
import { PageShell } from "@/components/PageShell";
import { LeadsPageSkeleton } from "@/components/Skeletons";
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
import { downloadCsv, stamp, toCsv } from "@/lib/csv";
import {
  ALL,
  LEAD_STATUSES,
  leadsDefaultSearch,
  statusLabel,
  validateLeadsSearch,
  type LeadsSearch,
} from "@/lib/leads-search";
import type { CallRow, LeadPatch, LeadRow } from "@/lib/leads-types";
import { cn } from "@/lib/utils";



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
  score: number | null;
  score_band: string | null;
  score_reasons: string[] | null;
  status: string | null;
  owner_notes: string | null;
  callback_at: string | null;
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
  // Filtering/sorting happens in the URL, so returning to the dashboard should
  // paint instantly from cache and revalidate in the background.
  staleTime: 30_000,
});


export const Route = createFileRoute("/_authenticated/leads")({
  validateSearch: validateLeadsSearch,
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
        content:
          "Search transcripts and filter qualified real estate leads by location, budget and date.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Leads,
  // Paint the real dashboard skeleton quickly instead of a blank screen.
  pendingMs: 150,
  pendingMinMs: 300,
  pendingComponent: () => (
    <Shell>
      <LeadsPageSkeleton />
    </Shell>
  ),
  errorComponent: ({ error }) => (
    <Shell>
      <Card className="panel-3d p-6 text-sm">
        Could not load leads: {error instanceof Error ? error.message : "unknown error"}
      </Card>
    </Shell>
  ),

});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      eyebrow="Pipeline"
      title={<>Leads &amp; call records</>}
      description="Every completed call is stored with its transcript, detected language, extracted requirement and AI-written summary."
    >
      {children}
    </PageShell>
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
  const queryClient = useQueryClient();

  const setSearch = (patch: Partial<LeadsSearch>) =>
    navigate({ search: (prev: LeadsSearch) => ({ ...prev, ...patch }) });

  const leadByCall = new Map(data.leads.filter((l) => l.call_id).map((l) => [l.call_id!, l]));

  const locations = uniqueSorted(data.leads.map((l) => l.location));
  const budgets = uniqueSorted(data.leads.map((l) => l.budget));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const total = data.calls.length;
  const hot = data.leads.filter((l) => l.score_band === "hot").length;
  const qualified = data.leads.filter((l) => !!l.budget && !!l.location).length;
  const avgScore = data.leads.length
    ? Math.round(data.leads.reduce((sum, l) => sum + (l.score ?? 0), 0) / data.leads.length)
    : 0;

  const q = search.q.trim().toLowerCase();
  const fromTime = search.from ? new Date(`${search.from}T00:00:00`).getTime() : null;
  const toTime = search.to ? new Date(`${search.to}T23:59:59`).getTime() : null;

  const filtered = [...data.calls].filter((call) => {
    const lead = leadByCall.get(call.id);

    if (search.location !== ALL && (lead?.location ?? "") !== search.location) return false;
    if (search.budget !== ALL && (lead?.budget ?? "") !== search.budget) return false;
    if (search.band !== ALL && (lead?.score_band ?? "") !== search.band) return false;
    if (search.status !== ALL && (lead?.status ?? "new") !== search.status) return false;


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

  if (search.sort === "score") {
    filtered.sort(
      (a, b) =>
        (leadByCall.get(b.id)?.score ?? -1) - (leadByCall.get(a.id)?.score ?? -1),
    );
  }

  const exportLeads = () => {
    const csv = toCsv(
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
      filtered.map((call) => {
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
    downloadCsv(`leads-${stamp()}.csv`, csv);
  };

  const exportTranscripts = () => {
    const rows: unknown[][] = [];
    filtered.forEach((call) => {
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
    const csv = toCsv(
      ["Call ID", "Call date", "Name", "Phone", "Turn", "Speaker", "Message"],
      rows,
    );
    downloadCsv(`call-transcripts-${stamp()}.csv`, csv);
  };

  const hasFilters =
    !!search.q ||
    search.location !== ALL ||
    search.budget !== ALL ||
    search.band !== ALL ||
    search.status !== ALL ||
    search.sort !== "recent" ||
    !!search.from ||
    !!search.to;

  return (
    <Shell>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Calls handled" value={String(total)} />
        <Metric label="Hot leads" value={String(hot)} />
        <Metric label="Fully qualified" value={String(qualified)} />
        <Metric label="Avg lead score" value={`${avgScore}/100`} />
      </div>

      <Card className="panel-3d p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">

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

          <div>
            <Label className="text-xs text-muted-foreground">Lead score</Label>
            <Select value={search.band} onValueChange={(v) => setSearch({ band: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All scores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All scores</SelectItem>
                <SelectItem value="hot">Hot (70+)</SelectItem>
                <SelectItem value="warm">Warm (40-69)</SelectItem>
                <SelectItem value="cold">Cold (&lt;40)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Pipeline status</Label>
            <Select value={search.status} onValueChange={(v) => setSearch({ status: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <Select value={search.sort} onValueChange={(v) => setSearch({ sort: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="score">Highest lead score</SelectItem>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={exportLeads}
            >
              <Download className="size-4" /> Leads &amp; summaries CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={exportTranscripts}
            >
              <Download className="size-4" /> Transcripts CSV
            </Button>
            {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch(leadsDefaultSearch)}

            >
              <X className="size-4" /> Clear filters
            </Button>
            )}
          </div>
        </div>
      </Card>

      {data.calls.length === 0 ? (
        <EmptyState
          icon={<PhoneCall className="size-5" />}
          title="No calls recorded yet"
          description="Run a call on the demo page and hang up — the qualified requirement, lead score and AI summary land here within a couple of seconds."
          action={
            <Button asChild size="sm">
              <Link to="/">Start a demo call</Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="No calls match these filters"
          description={
            <>
              {data.calls.length} call{data.calls.length === 1 ? "" : "s"} stored, but none match the
              current search, score band, status or date range.
            </>
          }
          action={
            <Button variant="outline" size="sm" onClick={() => setSearch(leadsDefaultSearch)}>
              <X className="size-4" /> Clear all filters
            </Button>
          }
        />
      ) : (

        filtered.map((call) => {
          const lead = leadByCall.get(call.id);
          const matchingTurns = q
            ? (call.transcript ?? []).filter((t) => t.content.toLowerCase().includes(q))
            : [];
          return (
            <Card key={call.id} className="tilt-card panel-3d p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{call.channel}</Badge>
                {call.language && <Badge variant="outline">{call.language}</Badge>}
                {lead && typeof lead.score === "number" && <ScoreBadge lead={lead} />}
                <Badge variant="outline">{statusLabel(lead?.status)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(call.started_at).toLocaleString("en-IN")}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => setOpenCallId(call.id)}
                >
                  <PanelRight className="size-4" /> Open details
                </Button>
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
                    <Row label="Configuration" value={lead?.configuration} />
                    <Row label="Budget" value={lead?.budget} />
                    <Row label="Timeline" value={lead?.timeline} />
                  </dl>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    AI call summary
                  </p>
                  <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed">
                    {call.summary || "—"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenCallId(call.id)}
                    className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Score signals, follow-up &amp; transcript →
                  </button>
                </div>
              </div>

              {matchingTurns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenCallId(call.id)}
                  className="mt-5 block w-full rounded-md border border-border bg-muted/40 p-3 text-left transition-colors hover:bg-muted/70"
                >
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
                </button>
              )}
            </Card>
          );
        })
      )}

      <LeadDetailPanel
        open={!!openCall}
        onOpenChange={(next) => setOpenCallId(next ? openCallId : null)}
        call={openCall ?? null}
        lead={(openCall && leadByCall.get(openCall.id)) || null}
        highlight={search.q.trim()}
        onSaveLead={saveLead}
      />
    </Shell>
  );
}

function ScoreBadge({ lead }: { lead: LeadRow }) {
  const band = lead.score_band ?? "cold";
  return (
    <Badge
      className={cn(
        "border",
        band === "hot" && "border-transparent bg-primary text-primary-foreground",
        band === "warm" && "border-transparent bg-accent text-accent-foreground",
        band === "cold" && "bg-muted text-muted-foreground",
      )}
    >
      {band === "hot" ? "🔥 " : ""}
      {band.charAt(0).toUpperCase() + band.slice(1)} · {lead.score}/100
    </Badge>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="tilt-card panel-3d p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold">{value}</p>
    </Card>
  );
}

