import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  queryFn: async () => {
    const [leads, calls] = await Promise.all([
      supabase
        .from("leads")
        .select("score, score_band, status, location, budget, timeline, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("calls").select("id, channel, status").limit(500),
    ]);
    if (leads.error) throw leads.error;
    if (calls.error) throw calls.error;
    return {
      leads: (leads.data ?? []) as unknown as Row[],
      calls: (calls.data ?? []) as { id: string; channel: string; status: string }[],
    };
  },
});

export const Route = createFileRoute("/_authenticated/analytics")({
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
  pendingComponent: () => (
    <Shell>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-56 w-full" />
    </Shell>
  ),
  errorComponent: ({ error }) => (
    <Shell>
      <Card className="p-6 text-sm">
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

  return (
    <Shell>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Calls handled" value={String(totalCalls)} sub={`${completed} completed`} />
        <Stat label="Leads captured" value={String(leads.length)} sub={`${phone} by phone`} />
        <Stat
          label="Qualification rate"
          value={`${qualificationRate}%`}
          sub="location + budget + timeline"
        />
        <Stat label="Avg lead score" value={`${avgScore}/100`} sub="0–100 scoring engine" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="tilt-card p-6">
          <h2 className="text-lg font-semibold">Lead score mix</h2>
          <Bars rows={bands} total={leads.length} />
        </Card>
        <Card className="tilt-card p-6">
          <h2 className="text-lg font-semibold">Pipeline status</h2>
          <Bars rows={statuses} total={leads.length} />
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Most requested locations</h2>
        {locations.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No location data yet.</p>
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
    <Card className="tilt-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}

function Bars({ rows, total }: { rows: { label: string; value: number }[]; total: number }) {
  const max = Math.max(1, total);
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="capitalize">{row.label}</span>
            <span className="text-muted-foreground">{row.value}</span>
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
