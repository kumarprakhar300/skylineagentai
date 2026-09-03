import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GripVertical, Inbox, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUSES, leadsDefaultSearch, statusLabel } from "@/lib/leads-search";
import type { LeadRow } from "@/lib/leads-types";
import {
  bandTone,
  capturedRequirements,
  leadBand,
  missingRequirements,
  REQUIREMENT_BUCKETS,
  REQUIREMENT_FIELDS,
  REQUIREMENT_LABELS,
  requirementBucket,
  SCORE_BANDS,
  type RequirementBucket,
  type ScoreBand,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";

const pipelineQuery = queryOptions({
  queryKey: ["leads"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { leads: (data ?? []) as unknown as LeadRow[] };
  },
  staleTime: 30_000,
});

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "Lead Pipeline Board — Skyline Estates AI Agent" },
      {
        name: "description",
        content:
          "Drag qualified real estate leads through the follow-up pipeline, grouped by Hot/Warm/Cold score band and how complete their captured requirements are.",
      },
      { property: "og:title", content: "Lead pipeline board" },
      {
        property: "og:description",
        content:
          "Drag-and-drop stage flow for AI-qualified leads, grouped by score band and requirements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pipeline,
  errorComponent: ({ error }) => (
    <Shell>
      <Card className="panel-3d p-6 text-sm">
        Could not load the pipeline: {error instanceof Error ? error.message : "unknown error"}
      </Card>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      eyebrow="Pipeline board"
      title={<>Stage flow</>}
      description="Drag a lead card into the next stage to move it through follow-up. Cards are grouped inside each stage so hot, fully qualified leads sit at the top."
    >
      {children}
    </PageShell>
  );
}

type GroupBy = "band" | "requirements";

function Pipeline() {
  const { data } = useSuspenseQuery(pipelineQuery);
  const queryClient = useQueryClient();

  const [groupBy, setGroupBy] = useState<GroupBy>("band");
  const [bandFilter, setBandFilter] = useState<"all" | ScoreBand>("all");
  const [reqFilter, setReqFilter] = useState<"all" | RequirementBucket>("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const leads = data.leads.filter((lead) => {
    if (bandFilter !== "all" && leadBand(lead) !== bandFilter) return false;
    if (reqFilter !== "all" && requirementBucket(lead) !== reqFilter) return false;
    return true;
  });

  async function moveLead(leadId: string, status: string) {
    const lead = data.leads.find((l) => l.id === leadId);
    if (!lead || (lead.status ?? "new") === status) return;

    const previous = queryClient.getQueryData(pipelineQuery.queryKey);
    queryClient.setQueryData(pipelineQuery.queryKey, (current: { leads: LeadRow[] } | undefined) =>
      current
        ? { ...current, leads: current.leads.map((l) => (l.id === leadId ? { ...l, status } : l)) }
        : current,
    );

    const { error } = await supabase
      .from("leads")
      .update({ status } as never)
      .eq("id", leadId);

    if (error) {
      queryClient.setQueryData(pipelineQuery.queryKey, previous);
      toast.error(error.message);
      return;
    }
    toast.success(`Moved to ${statusLabel(status)}`);
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
  }

  return (
    <Shell>
      <Card className="panel-3d grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
        <div>
          <Label className="text-xs text-muted-foreground">Group cards by</Label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="band">Score band</SelectItem>
              <SelectItem value="requirements">Requirement completeness</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Score band</Label>
          <Select value={bandFilter} onValueChange={(v) => setBandFilter(v as "all" | ScoreBand)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All bands</SelectItem>
              {SCORE_BANDS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Requirements</Label>
          <Select
            value={reqFilter}
            onValueChange={(v) => setReqFilter(v as "all" | RequirementBucket)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any completeness</SelectItem>
              {REQUIREMENT_BUCKETS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {leads.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title="No leads match these groups"
          description="Loosen the score band or requirement filters, or run a demo call to capture a fresh lead."
          action={
            <>
              <Button asChild size="sm" variant="outline">
                <Link to="/leads" search={leadsDefaultSearch}>
                  Open leads table
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/">
                  <Phone className="size-4" /> Run a demo call
                </Link>
              </Button>
            </>
          }
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-3 sm:gap-4">
            {LEAD_STATUSES.map((stage) => {
              const stageLeads = leads.filter((l) => (l.status ?? "new") === stage.value);
              return (
                <div
                  key={stage.value}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverStage(stage.value);
                  }}
                  onDragLeave={() => setOverStage((s) => (s === stage.value ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOverStage(null);
                    const id = dragId ?? e.dataTransfer.getData("text/plain");
                    setDragId(null);
                    if (id) void moveLead(id, stage.value);
                  }}
                  className={cn(
                    "w-[17rem] shrink-0 rounded-2xl border border-border/70 bg-secondary/30 p-3 transition-colors sm:w-[19rem]",
                    overStage === stage.value && "border-primary/60 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 px-1">
                    <p className="text-sm font-semibold tracking-tight">{stage.label}</p>
                    <Badge variant="secondary">{stageLeads.length}</Badge>
                  </div>

                  <div className="mt-3 space-y-3">
                    {stageLeads.length === 0 && (
                      <p className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                        Drop a lead here
                      </p>
                    )}

                    {groupsFor(groupBy).map((group) => {
                      const groupLeads = stageLeads.filter(
                        (l) => groupKey(groupBy, l) === group.value,
                      );
                      if (groupLeads.length === 0) return null;
                      return (
                        <div key={group.value} className="space-y-2">
                          <p className="px-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {group.label} · {groupLeads.length}
                          </p>
                          {groupLeads.map((lead) => (
                            <LeadCard
                              key={lead.id}
                              lead={lead}
                              dragging={dragId === lead.id}
                              onDragStart={(e) => {
                                setDragId(lead.id);
                                e.dataTransfer.setData("text/plain", lead.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                setDragId(null);
                                setOverStage(null);
                              }}
                              onMove={(status) => void moveLead(lead.id, status)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}

function groupsFor(groupBy: GroupBy): { value: string; label: string }[] {
  return groupBy === "band"
    ? SCORE_BANDS.map((b) => ({ value: b.value, label: b.label }))
    : REQUIREMENT_BUCKETS.map((b) => ({ value: b.value, label: b.label }));
}

function groupKey(groupBy: GroupBy, lead: LeadRow): string {
  return groupBy === "band" ? leadBand(lead) : requirementBucket(lead);
}

function LeadCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  lead: LeadRow;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMove: (status: string) => void;
}) {
  const band = leadBand(lead);
  const captured = capturedRequirements(lead).length;
  const missing = missingRequirements(lead);

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={`${lead.name ?? "Unnamed lead"} — ${statusLabel(lead.status)}`}
      className={cn("panel-3d cursor-grab p-3 active:cursor-grabbing", dragging && "opacity-50")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{lead.name ?? "Unnamed lead"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {lead.phone ?? "No number shared"}
          </p>
        </div>
        <GripVertical aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide",
            bandTone(band),
          )}
        >
          {band} · {lead.score ?? 0}
        </span>
        <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
          {captured}/{REQUIREMENT_FIELDS.length} requirements
        </span>
      </div>

      <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {lead.location && <div className="truncate">📍 {lead.location}</div>}
        {lead.budget && <div className="truncate">💰 {lead.budget}</div>}
        {lead.timeline && <div className="truncate">🗓 {lead.timeline}</div>}
      </dl>

      {missing.length > 0 && (
        <p className="mt-2 text-[0.7rem] leading-relaxed text-muted-foreground">
          Missing: {missing.map((f) => REQUIREMENT_LABELS[f]).join(", ")}
        </p>
      )}

      <div className="mt-3">
        <Select value={lead.status ?? "new"} onValueChange={onMove}>
          <SelectTrigger className="h-8 text-xs" aria-label="Move lead to stage">
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
    </Card>
  );
}
