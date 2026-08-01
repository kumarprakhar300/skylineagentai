import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, MapPin, PhoneCall } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { AnalyticsPageSkeleton } from "@/components/Skeletons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";


type Row = {
  score: number | null;
  score_band: string | null;
  status: string | null;
  location: string | null;
  budget: string | null;
  timeline: string | null;
  created_at: string;
};

const analyticsQuery = queryOptions({
  queryKey: ["analytics"],
  queryFn: async () => ({
    leads: [
      { score: 92, score_band: "hot", status: "contacted", location: "Wakad, Pune", budget: "1.2 cr", timeline: "immediate", created_at: new Date().toISOString() },
      { score: 45, score_band: "warm", status: "new", location: "Hinjewadi, Pune", budget: null, timeline: null, created_at: new Date().toISOString() },
    ] as unknown as Row[],
    calls: [{ id: "c1", channel: "phone", status: "completed" }, { id: "c2", channel: "web", status: "completed" }],
  }),
  // Charts render from cache on re-entry and refresh quietly behind the scenes.
  staleTime: 30_000,
});


export const Route = createFileRoute("/mobcheck2")({
  head: () => ({
    meta: [
      { title: "Call & Lead Analytics — Skyline Estates AI Agent" },
      {
        name: "description",
        content:
          "Qualification rate, hot/warm/cold split, pipeline status and channel mix across every AI voice call handled by the agent.",
      },
      { property: "og:title", content: "Call & lead analytics" },
      {
        property: "og:description",
        content: "Qualification rate, lead score mix and pipeline status for the AI calling agent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Analytics,
  pendingMs: 150,
  pendingMinMs: 300,
  pendingComponent: () => (
    <Shell>
      <AnalyticsPageSkeleton />
    </Shell>
  ),

  errorComponent: ({ error }) => (
    <Shell>
      <Card className="panel-3d p-6 text-sm">
        Could not load analytics: {error instanceof Error ? error.message : "unknown error"}
      </Card>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      eyebrow="Performance"
      title="Analytics"
      description="How the AI agent is performing across every call — qualification quality, intent mix and where leads sit in the pipeline."
    >
      {children}
    </PageShell>
  );
}


function count<T>(rows: T[], predicate: (row: T) => boolean) {
  return rows.filter(predicate).length;
}

function Analytics() {
  const { data } = useSuspenseQuery(analyticsQuery);
  const { leads, calls } = data;

  const totalCalls = calls.length;
  const completed = count(calls, (c) => c.status === "completed");
  const phone = count(calls, (c) => c.channel === "phone");
  const qualified = count(leads, (l) => !!l.location && !!l.budget && !!l.timeline);
  const qualificationRate = leads.length ? Math.round((qualified / leads.length) * 100) : 0;
  const avgScore = leads.length
    ? Math.round(leads.reduce((s, l) => s + (l.score ?? 0), 0) / leads.length)
    : 0;

  const bands = ["hot", "warm", "cold"].map((band) => ({
    label: band,
    value: count(leads, (l) => (l.score_band ?? "cold") === band),
  }));

  const statuses = ["new", "contacted", "visit_booked", "won", "dropped"].map((status) => ({
    label: status.replace("_", " "),
    value: count(leads, (l) => (l.status ?? "new") === status),
  }));

  const locations = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const key = l.location?.trim();
      if (key) acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (leads.length === 0 && totalCalls === 0) {
    return (
      <Shell>
        <EmptyState
          icon={<BarChart3 className="size-5" />}
          title="No call data to chart yet"
          description="Analytics fill in automatically once the agent has handled its first call — score mix, qualification rate and pipeline status all come from stored calls."
          action={
            <Button asChild size="sm">
              <Link to="/">Run the first call</Link>
            </Button>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Stat label="Calls handled" value={String(totalCalls)} sub={`${completed} completed`} />
        <Stat label="Leads captured" value={String(leads.length)} sub={`${phone} by phone`} />
        <Stat
          label="Qualification rate"
          value={`${qualificationRate}%`}
          sub="location + budget + timeline"
        />
        <Stat label="Avg lead score" value={`${avgScore}/100`} sub="0–100 scoring engine" />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Card className="tilt-card panel-3d p-4 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">Lead score mix</h2>
          {leads.length === 0 ? (
            <EmptyState
              bare
              icon={<PhoneCall className="size-5" />}
              title="No scored leads yet"
              description="Every completed call is scored 0–100 and lands in one of these bands."
            />
          ) : (
            <Bars rows={bands} total={leads.length} />
          )}
        </Card>
        <Card className="tilt-card panel-3d p-4 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">Pipeline status</h2>
          {leads.length === 0 ? (
            <EmptyState
              bare
              icon={<BarChart3 className="size-5" />}
              title="Pipeline is empty"
              description="Set a status on a lead in the dashboard and it shows up here."
            />
          ) : (
            <Bars rows={statuses} total={leads.length} />
          )}
        </Card>
      </div>

      <Card className="panel-3d p-4 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Most requested locations</h2>
        {locations.length === 0 ? (
          <EmptyState
            bare
            icon={<MapPin className="size-5" />}
            title="No location captured yet"
            description="The agent asks for a preferred location during qualification — answers appear here ranked by demand."
          />
        ) : (
          <Bars
            rows={locations.map(([label, value]) => ({ label, value }))}
            total={locations[0]?.[1] ?? 1}
          />
        )}
      </Card>
    </Shell>
  );

}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="tilt-card panel-3d p-3.5 sm:p-4">
      <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">{value}</p>
      <p className="mt-1 text-[0.68rem] leading-snug text-muted-foreground sm:text-xs">{sub}</p>
    </Card>
  );
}

function Bars({ rows, total }: { rows: { label: string; value: number }[]; total: number }) {
  const max = Math.max(1, total);
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate capitalize">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{row.value}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round((row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
