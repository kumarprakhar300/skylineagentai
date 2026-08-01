import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Loader2, Save, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
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
  pendingComponent: () => (
    <Shell>
      <Card className="panel-3d space-y-3 p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </Card>
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
        <Card className="panel-3d p-6 text-sm text-muted-foreground">
          No calls recorded yet. Start a call on the demo page and end it — the lead and summary
          will appear here.
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="panel-3d p-6 text-sm text-muted-foreground">
          No calls match these filters. Try clearing the search or widening the date range.
        </Card>
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
                    <Row
                      label="Lead score"
                      value={
                        typeof lead?.score === "number"
                          ? `${lead.score}/100 (${lead.score_band ?? "—"})`
                          : null
                      }
                    />
                  </dl>
                  {lead?.score_reasons && lead.score_reasons.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {lead.score_reasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  )}
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

              {lead && <LeadPipeline lead={lead} onSaved={refresh} />}

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

/** Post-call follow-up: status, callback time and private sales notes. */
function LeadPipeline({ lead, onSaved }: { lead: LeadRow; onSaved: () => void }) {
  const [status, setStatus] = useState(lead.status ?? "new");
  const [notes, setNotes] = useState(lead.owner_notes ?? "");
  const [callback, setCallback] = useState(
    lead.callback_at ? new Date(lead.callback_at).toISOString().slice(0, 16) : "",
  );
  const [busy, setBusy] = useState(false);

  const dirty =
    status !== (lead.status ?? "new") ||
    notes !== (lead.owner_notes ?? "") ||
    callback !== (lead.callback_at ? new Date(lead.callback_at).toISOString().slice(0, 16) : "");

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("leads")
      .update({
        status,
        owner_notes: notes.trim() || null,
        callback_at: callback ? new Date(callback).toISOString() : null,
      } as never)
      .eq("id", lead.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lead updated");
    onSaved();
  }

  return (
    <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Follow-up
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`cb-${lead.id}`} className="text-xs text-muted-foreground">
            Callback / site visit
          </Label>
          <Input
            id={`cb-${lead.id}`}
            type="datetime-local"
            className="mt-1.5"
            value={callback}
            onChange={(e) => setCallback(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3">
        <Label htmlFor={`notes-${lead.id}`} className="text-xs text-muted-foreground">
          Internal notes
        </Label>
        <Textarea
          id={`notes-${lead.id}`}
          className="mt-1.5"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What the sales team should know before calling back"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy || !dirty}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save follow-up
        </Button>
        <span className="text-xs text-muted-foreground">
          Currently: {statusLabel(lead.status)}
        </span>
      </div>
    </div>
  );
}
