import { Loader2, PhoneCall, Save, Search, Sparkle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SummarySections } from "@/components/SummarySections";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ConfidenceChip, ConfidenceText } from "@/components/ConfidenceText";
import { SpeakerLabel } from "@/components/SpeakerLabel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUSES, statusLabel } from "@/lib/leads-search";
import type { CallRow, LeadPatch, LeadRow } from "@/lib/leads-types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: CallRow | null;
  lead: LeadRow | null;
  /** Search term from the dashboard, highlighted inside the transcript. */
  highlight?: string;
  onSaveLead: (lead: LeadRow, patch: LeadPatch) => Promise<boolean>;
};

/** Highlights every occurrence of `term` inside `text`. */
function Highlighted({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={index} className="rounded bg-accent px-0.5 text-accent-foreground">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export function LeadDetailPanel({
  open,
  onOpenChange,
  call,
  lead,
  highlight = "",
  onSaveLead,
}: Props) {
  const [tab, setTab] = useState("summary");
  const [transcriptQuery, setTranscriptQuery] = useState(highlight);

  useEffect(() => {
    if (open) {
      setTab("summary");
      setTranscriptQuery(highlight);
    }
  }, [open, call?.id, highlight]);

  const turns = call?.transcript ?? [];
  const term = transcriptQuery.trim();
  const visibleTurns = useMemo(() => {
    const numbered = turns.map((t, index) => ({ ...t, turnNumber: index + 1 }));
    return term
      ? numbered.filter((t) => t.content.toLowerCase().includes(term.toLowerCase()))
      : numbered;
  }, [turns, term]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        {call && (
          <>
            <SheetHeader className="border-b border-border bg-secondary/30 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{call.channel}</Badge>
                {call.language && <Badge variant="outline">{call.language}</Badge>}
                {lead && typeof lead.score === "number" && (
                  <Badge
                    className={cn(
                      "border",
                      lead.score_band === "hot" &&
                        "border-transparent bg-primary text-primary-foreground",
                      lead.score_band === "warm" &&
                        "border-transparent bg-accent text-accent-foreground",
                      (!lead.score_band || lead.score_band === "cold") &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {(lead.score_band ?? "cold").replace(/^./, (c) => c.toUpperCase())} ·{" "}
                    {lead.score}/100
                  </Badge>
                )}
              </div>
              <SheetTitle className="mt-2 font-serif text-xl sm:text-2xl">
                {lead?.name?.trim() || "Unnamed caller"}
              </SheetTitle>
              <SheetDescription>
                {[lead?.phone, lead?.location, lead?.configuration]
                  .filter(Boolean)
                  .join(" · ") || "No contact details captured"}
                {" — "}
                {new Date(call.started_at).toLocaleString("en-IN")}
              </SheetDescription>
            </SheetHeader>

            <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
              <div className="border-b border-border px-4 py-3 sm:px-6">
                <TabsList className="w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsTrigger value="summary" className="flex-1">
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="signals" className="flex-1">
                    Signals
                  </TabsTrigger>
                  <TabsTrigger value="followup" className="flex-1">
                    Follow-up
                  </TabsTrigger>
                  <TabsTrigger value="transcript" className="flex-1">
                    Transcript
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <TabsContent value="summary" className="mt-0 space-y-5">
                  <section>
                    <SectionLabel>AI call summary</SectionLabel>
                    <div className="mt-2">
                      <SummarySections summary={call.summary} />
                    </div>
                  </section>
                  <section>
                    <SectionLabel>Requirement captured</SectionLabel>
                    <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                      <Row label="Phone" value={lead?.phone} />
                      <Row label="Buy / invest" value={lead?.intent} />
                      <Row label="Location" value={lead?.location} />
                      <Row label="Property type" value={lead?.property_type} />
                      <Row label="Configuration" value={lead?.configuration} />
                      <Row label="Budget" value={lead?.budget} />
                      <Row label="Purpose" value={lead?.purpose} />
                      <Row label="Timeline" value={lead?.timeline} />
                    </dl>
                  </section>
                </TabsContent>

                <TabsContent value="signals" className="mt-0 space-y-5">
                  <section>
                    <SectionLabel>Lead score</SectionLabel>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="font-serif text-4xl font-semibold">
                        {typeof lead?.score === "number" ? lead.score : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        /100 · {(lead?.score_band ?? "not scored").toString()}
                      </p>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, lead?.score ?? 0))}%` }}
                      />
                    </div>
                  </section>
                  <section>
                    <SectionLabel>Why this score</SectionLabel>
                    {lead?.score_reasons && lead.score_reasons.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {lead.score_reasons.map((reason) => (
                          <li
                            key={reason}
                            className="flex gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm"
                          >
                            <Sparkle className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No scoring signals recorded for this call.
                      </p>
                    )}
                  </section>
                </TabsContent>

                <TabsContent value="followup" className="mt-0">
                  {lead ? (
                    <FollowUp lead={lead} onSaveLead={onSaveLead} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No lead record was created for this call, so there is nothing to follow up on
                      yet.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="transcript" className="mt-0">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={transcriptQuery}
                      onChange={(e) => setTranscriptQuery(e.target.value)}
                      placeholder="Search inside this transcript"
                      className="pl-9"
                      aria-label="Search inside this transcript"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {term
                      ? `${visibleTurns.length} of ${turns.length} turns match "${term}"`
                      : `${turns.length} turn${turns.length === 1 ? "" : "s"}`}
                  </p>
                  <div className="mt-4 space-y-3">
                    {visibleTurns.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        {turns.length === 0
                          ? "No transcript stored for this call."
                          : "No turns match that search."}
                      </p>
                    ) : (
                      visibleTurns.map((turn, index) => (
                        <div
                          key={index}
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                            turn.role === "user"
                              ? "ml-auto bg-primary text-primary-foreground"
                              : "border border-border bg-secondary/40",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <SpeakerLabel
                              role={turn.role}
                              turnNumber={turn.turnNumber}
                              tone={turn.role === "user" ? "onPrimary" : "muted"}
                            />
                            {turn.role === "user" && (
                              <ConfidenceChip
                                segments={turn.segments}
                                refined={turn.refined}
                                className={
                                  turn.role === "user"
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : undefined
                                }
                              />
                            )}
                          </span>
                          <p className="mt-1 whitespace-pre-wrap">
                            {term || turn.role !== "user" || !turn.segments?.length ? (
                              <Highlighted text={turn.content} term={term} />
                            ) : (
                              <ConfidenceText
                                text={turn.content}
                                segments={turn.segments}
                                tone="onPrimary"
                              />
                            )}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value ? "text-right font-medium" : "text-muted-foreground/50"}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function localValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Post-call follow-up: status, callback time and private sales notes. */
function FollowUp({
  lead,
  onSaveLead,
}: {
  lead: LeadRow;
  onSaveLead: (lead: LeadRow, patch: LeadPatch) => Promise<boolean>;
}) {
  const [status, setStatus] = useState(lead.status ?? "new");
  const [notes, setNotes] = useState(lead.owner_notes ?? "");
  const [callback, setCallback] = useState(localValue(lead.callback_at));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(lead.status ?? "new");
    setNotes(lead.owner_notes ?? "");
    setCallback(localValue(lead.callback_at));
  }, [lead.id, lead.status, lead.owner_notes, lead.callback_at]);

  const dirty =
    status !== (lead.status ?? "new") ||
    notes !== (lead.owner_notes ?? "") ||
    callback !== localValue(lead.callback_at);

  async function save() {
    setBusy(true);
    await onSaveLead(lead, {
      status,
      owner_notes: notes.trim() || null,
      callback_at: callback ? new Date(callback).toISOString() : null,
    });
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
        <span className="text-muted-foreground">Current status:</span>{" "}
        <span className="font-medium">{statusLabel(lead.status)}</span>
        {lead.callback_at && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <PhoneCall className="size-3.5" />
            Callback {new Date(lead.callback_at).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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

      <div>
        <Label htmlFor={`notes-${lead.id}`} className="text-xs text-muted-foreground">
          Internal notes
        </Label>
        <Textarea
          id={`notes-${lead.id}`}
          className="mt-1.5"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What the sales team should know before calling back"
        />
      </div>

      <Button size="sm" onClick={save} disabled={busy || !dirty}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save follow-up
      </Button>
    </div>
  );
}
