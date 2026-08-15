import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { AdminSearch } from "@/lib/admin-search";
import { ArrowDown, ArrowUp, Clock, Download, MessagesSquare, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 20;

import { BulkLeadActions } from "@/components/BulkLeadActions";
import { EmptyState } from "@/components/EmptyState";
import { ExportCsvDialog } from "@/components/ExportCsvDialog";
import { FilterPresets } from "@/components/FilterPresets";
import { Checkbox } from "@/components/ui/checkbox";

import { SpeakerLabel } from "@/components/SpeakerLabel";
import { SummarySections } from "@/components/SummarySections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { Turn } from "@/lib/agent/prompt";
import { ALL, LEAD_STATUSES } from "@/lib/leads-search";
import type { CallRow, LeadRow } from "@/lib/leads-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SORT_OPTIONS = [
  { value: "recent", label: "Date: newest first", icon: ArrowDown },
  { value: "oldest", label: "Date: oldest first", icon: ArrowUp },
  { value: "score_desc", label: "Score: high to low", icon: ArrowDown },
  { value: "score_asc", label: "Score: low to high", icon: ArrowUp },
  { value: "status_asc", label: "Status: A – Z", icon: ArrowUp },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];


type ViewerCall = {
  id: string;
  channel: string;
  language: string | null;
  summary: string | null;
  transcript: Turn[] | null;
  started_at: string;
  ended_at: string | null;
};


/**
 * Turn timestamps are not recorded per turn, so the viewer spreads the call's
 * duration evenly across its turns. The offsets are labelled as approximate.
 */
function turnOffsets(call: ViewerCall): number[] {
  const turns = call.transcript ?? [];
  if (turns.length === 0) return [];
  const start = new Date(call.started_at).getTime();
  const end = call.ended_at ? new Date(call.ended_at).getTime() : start;
  const duration = Math.max(0, end - start);
  const step = turns.length > 1 ? duration / (turns.length - 1) : 0;
  return turns.map((_, index) => Math.round((step * index) / 1000));
}

function elapsedLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function clockLabel(call: ViewerCall, offsetSeconds: number): string {
  const t = new Date(new Date(call.started_at).getTime() + offsetSeconds * 1000);
  return t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AdminTranscriptViewer() {
  // Filters live in the URL so a filtered view can be shared or reloaded.
  const urlSearch = useSearch({ from: "/_authenticated/admin" });
  const navigate = useNavigate({ from: "/admin" });
  const patch = (next: Partial<AdminSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });

  const search = urlSearch.q ?? "";
  const status = urlSearch.status ?? ALL;
  const band = urlSearch.band ?? ALL;
  const from = urlSearch.from ?? "";
  const to = urlSearch.to ?? "";
  const sort = (urlSearch.sort ?? "recent") as SortValue;
  const selectedId = urlSearch.call ?? null;

  const setSearch = (value: string) => patch({ q: value || undefined });
  const setStatus = (value: string) => patch({ status: value === ALL ? undefined : value });
  const setBand = (value: string) => patch({ band: value === ALL ? undefined : value });
  const setFrom = (value: string) => patch({ from: value || undefined });
  const setTo = (value: string) => patch({ to: value || undefined });
  const setSort = (value: SortValue) => patch({ sort: value === "recent" ? undefined : value });
  const setSelectedId = (id: string) => patch({ call: id });

  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const calls = useQuery({
    queryKey: ["admin-transcripts"],
    staleTime: 30_000,
    queryFn: async () => {
      const [callRes, leadRes] = await Promise.all([
        supabase
          .from("calls")
          .select("id, channel, language, summary, transcript, started_at, ended_at")
          .order("started_at", { ascending: false })
          .limit(100),
        supabase.from("leads").select("*").limit(500),
      ]);
      if (callRes.error) throw callRes.error;
      if (leadRes.error) throw leadRes.error;
      const leadByCall = new Map<string, LeadRow>();
      ((leadRes.data ?? []) as unknown as LeadRow[]).forEach((lead) => {
        if (lead.call_id) leadByCall.set(lead.call_id, lead);
      });
      return {
        calls: (callRes.data ?? []) as unknown as ViewerCall[],
        leadByCall,
      };
    },
  });

  const allCalls = calls.data?.calls ?? [];
  const leadByCall = calls.data?.leadByCall;

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59`).getTime() : null;
    const filtered = allCalls.filter((call) => {
      const lead = leadByCall?.get(call.id);
      if (term) {
        const haystack = [lead?.name, lead?.phone, lead?.location, call.channel, call.language]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (status !== ALL && (lead?.status ?? "new") !== status) return false;
      if (band !== ALL && (lead?.score_band ?? "cold") !== band) return false;
      const started = new Date(call.started_at).getTime();
      if (fromTime !== null && started < fromTime) return false;
      if (toTime !== null && started > toTime) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const leadA = leadByCall?.get(a.id);
      const leadB = leadByCall?.get(b.id);
      switch (sort) {
        case "oldest":
          return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        case "score_desc":
          return (leadB?.score ?? 0) - (leadA?.score ?? 0);
        case "score_asc":
          return (leadA?.score ?? 0) - (leadB?.score ?? 0);
        case "status_asc": {
          const statusA = leadA?.status ?? "new";
          const statusB = leadB?.status ?? "new";
          return statusA.localeCompare(statusB);
        }
        case "recent":
        default:
          return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      }
    });
    return sorted;
  }, [allCalls, leadByCall, search, status, band, from, to, sort]);

  const filtersActive =
    Boolean(search || from || to) || status !== ALL || band !== ALL || sort !== "recent";

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, status, band, from, to, sort, allCalls.length]);

  const visibleList = useMemo(() => list.slice(0, visibleCount), [list, visibleCount]);
  const hasMore = visibleCount < list.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, list.length));
        }
      },
      { root: node.parentElement, rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, list.length]);

  const active = (selectedId ? list.find((c) => c.id === selectedId) : null) ?? list[0] ?? null;
  const activeLead = active ? leadByCall?.get(active.id) ?? null : null;

  // A shared link that pins a call reopens that transcript automatically.
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current) return;
    if (selectedId && list.some((c) => c.id === selectedId)) {
      openedFromUrl.current = true;
      setDetailOpen(true);
    }
  }, [selectedId, list]);


  const rows = useMemo(() => {
    if (!active) return [];
    const offsets = turnOffsets(active);
    const term = query.trim().toLowerCase();
    return (active.transcript ?? [])
      .map((turn, index) => ({ turn, index, offset: offsets[index] ?? 0 }))
      .filter(({ turn }) => (term ? turn.content.toLowerCase().includes(term) : true));
  }, [active, query]);

  if (calls.isLoading) {
    return (
      <Card className="panel-3d p-4 sm:p-6">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="panel-3d p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">Transcript viewer</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Replay any captured call turn by turn with approximate timestamps, next to the sectioned
            AI summary for the same call.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => {
              if (selectedIds.size === 0) return;
              exportSelectedLeads(selectedIds, list, leadByCall);
              toast.success(
                `${selectedIds.size} lead${selectedIds.size === 1 ? "" : "s"} exported`,
              );
            }}
          >
            <Download className="size-4" /> Export selected ({selectedIds.size})
          </Button>
          <Button variant="outline" size="sm" onClick={() => void calls.refetch()}>
            <RefreshCw className={cn("size-4", calls.isFetching && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-xl border border-border/70 bg-secondary/20 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,0.85fr))_auto]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, location"
            aria-label="Search calls by name, phone or location"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 text-sm" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
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
        <Select value={band} onValueChange={setBand}>
          <SelectTrigger className="h-9 text-sm" aria-label="Filter by score band">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All scores</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortValue)}>
          <SelectTrigger className="h-9 text-sm" aria-label="Sort calls">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    {option.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="Calls from date"
          className="h-9 text-sm"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Calls until date"
          className="h-9 text-sm"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          disabled={!filtersActive}
          onClick={() =>
            patch({
              q: undefined,
              status: undefined,
              band: undefined,
              sort: undefined,
              from: undefined,
              to: undefined,
            })
          }
        >
          Reset
        </Button>
      </div>

      <FilterPresets current={urlSearch} onApply={(next) => patch(next)} />

      <BulkLeadActions
        callIds={[...selectedIds]}
        visibleCount={visibleList.length}
        onSelectAllVisible={() => setSelectedIds(new Set(visibleList.map((c) => c.id)))}
        onClear={() => setSelectedIds(new Set())}
      />



      {list.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<MessagesSquare className="size-5" />}
            title={filtersActive ? "No calls match these filters" : "No calls captured yet"}
            description={
              filtersActive
                ? "Try widening the date range or clearing the search to see more calls."
                : "Run a browser or phone demo call — the transcript and its summary will appear here."
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {visibleList.length} of {list.length} filtered · {allCalls.length} total calls
          </p>
          <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
            {visibleList.map((call) => {
              const lead = leadByCall?.get(call.id);
              const checked = selectedIds.has(call.id);

              return (
                <div
                  key={call.id}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md border px-2 py-1.5",
                    checked ? "border-primary/60 bg-primary/10" : "border-border/70 bg-secondary/20",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSelected(call.id)}
                    aria-label={`Select call with ${lead?.name?.trim() || "unnamed caller"} for bulk actions`}
                  />
                  <Button
                    size="sm"
                    variant={call.id === selectedId ? "default" : "ghost"}
                    className="h-auto flex-col items-start gap-0.5 py-1 text-left"
                    onClick={() => {
                      setSelectedId(call.id);
                      setQuery("");
                      setDetailOpen(true);
                    }}
                  >
                    <span className="text-xs font-semibold">
                      {lead?.name?.trim() || "Unnamed caller"}
                    </span>
                    <span className="text-[11px] font-normal opacity-70">
                      {new Date(call.started_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Button>
                </div>
              );
            })}

            {hasMore && (
              <div ref={sentinelRef} className="flex shrink-0 items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-auto py-1.5 text-xs"
                  onClick={() =>
                    setVisibleCount((count) => Math.min(count + PAGE_SIZE, list.length))
                  }
                >
                  Load {Math.min(PAGE_SIZE, list.length - visibleCount)} more
                </Button>
              </div>
            )}
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Click a call to open its transcript and sectioned summary.
          </p>

          <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
            <SheetContent
              side="right"
              className="w-full overflow-y-auto sm:max-w-3xl"
              aria-describedby={undefined}
            >
              {active && (
                <>
                  <SheetHeader className="text-left">
                    <SheetTitle className="font-serif text-xl">
                      {activeLead?.name?.trim() || "Unnamed caller"}
                    </SheetTitle>
                    <SheetDescription>
                      {[activeLead?.phone, activeLead?.location].filter(Boolean).join(" · ") ||
                        "No contact details captured"}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
                    {/* Conversation turns */}
                    <div className="rounded-xl border border-border/70 bg-secondary/20">
                      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3">
                        <Badge variant="secondary">{active.channel}</Badge>
                        {active.language && <Badge variant="outline">{active.language}</Badge>}
                        <Badge variant="outline" className="gap-1">
                          <Clock className="size-3" />
                          {(active.transcript ?? []).length} turns
                        </Badge>
                        <div className="relative ml-auto w-full sm:w-48">
                          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search this transcript"
                            aria-label="Search this transcript"
                            className="h-8 pl-8 text-sm"
                          />
                        </div>
                      </div>

                      <ol className="max-h-[32rem] space-y-2 overflow-y-auto p-3">
                        {rows.length === 0 && (
                          <p className="py-6 text-center text-sm text-muted-foreground">
                            No turns match “{query}”.
                          </p>
                        )}
                        {rows.map(({ turn, index, offset }) => (
                          <li
                            key={index}
                            className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-border/60 bg-card/70 p-2.5"
                          >
                            <div className="text-right">
                              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                                {elapsedLabel(offset)}
                              </p>
                              <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground/60">
                                {clockLabel(active, offset)}
                              </p>
                            </div>
                            <div>
                              <SpeakerLabel role={turn.role} turnNumber={index + 1} />
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                                {turn.content}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <p className="border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
                        Timestamps are approximate — spread across the call duration
                        {active.ended_at
                          ? ` (${elapsedLabel(
                              Math.max(
                                0,
                                Math.round(
                                  (new Date(active.ended_at).getTime() -
                                    new Date(active.started_at).getTime()) /
                                    1000,
                                ),
                              ),
                            )} total)`
                          : " (call still open)"}
                        .
                      </p>
                    </div>

                    {/* Sectioned summary side by side */}
                    <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/20 p-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Call started
                        </p>
                        <p className="mt-0.5 text-sm">
                          {new Date(active.started_at).toLocaleString("en-IN")}
                        </p>
                        {typeof activeLead?.score === "number" && (
                          <Badge variant="outline" className="mt-2">
                            {(activeLead.score_band ?? "cold").replace(/^./, (c) =>
                              c.toUpperCase(),
                            )}{" "}
                            · {activeLead.score}/100
                          </Badge>
                        )}
                      </div>
                      <div className="border-t border-border/70 pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Sectioned summary
                        </p>
                        <div className="mt-2">
                          <SummarySections summary={active.summary} />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </>
      )}
    </Card>
  );
}

