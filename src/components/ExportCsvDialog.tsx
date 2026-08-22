import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_EXPORT_COLUMN_KEYS,
  LEAD_EXPORT_COLUMNS,
  downloadLeadsCsv,
  downloadTranscriptsCsv,
} from "@/lib/leads-export";
import type { CallRow, LeadRow } from "@/lib/leads-types";
import { explainScoreReasons } from "@/lib/score-breakdown";

import { downloadLeadsXlsx } from "@/lib/xlsx-export";

const PREVIEW_LIMIT_OPTIONS = [5, 10, 25] as const;

type Source = () => Promise<{ calls: CallRow[]; leadByCall: Map<string, LeadRow> }>;

const GROUPS = ["Call", "Lead", "Score", "Score breakdown", "Pipeline", "Summary sections"] as const;

export function ExportCsvDialog({
  source,
  count,
  scopeLabel,
  triggerLabel = "Export CSV",
  disabled = false,
}: {
  /** Resolves the rows to export — already narrowed to the active filters. */
  source: Source;
  /** How many calls will be exported, for the dialog copy. */
  count?: number;
  /** e.g. "matching the current filters". */
  scopeLabel?: string;
  triggerLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<string[]>(DEFAULT_EXPORT_COLUMN_KEYS);
  const [busy, setBusy] = useState<"leads" | "transcripts" | "xlsx" | null>(null);
  const [includeTranscripts, setIncludeTranscripts] = useState(true);
  const [preview, setPreview] = useState<{
    calls: CallRow[];
    leadByCall: Map<string, LeadRow>;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLimit, setPreviewLimit] = useState<number>(5);
  const [explainSignals, setExplainSignals] = useState(false);
  const [bands, setBands] = useState<Record<"hot" | "warm" | "cold", boolean>>({
    hot: true,
    warm: true,
    cold: true,
  });

  const filteredCalls = useMemo(() => {
    if (!preview) return [];
    return preview.calls.filter((call) => {
      const band = preview.leadByCall.get(call.id)?.score_band;
      if (!band) return false;
      return bands[band as "hot" | "warm" | "cold"] ?? false;
    });
  }, [preview, bands]);



  const grouped = useMemo(
    () => GROUPS.map((group) => ({ group, columns: LEAD_EXPORT_COLUMNS.filter((c) => c.group === group) })),
    [],
  );

  const selectedColumns = useMemo(
    () => LEAD_EXPORT_COLUMNS.filter((c) => keys.includes(c.key)),
    [keys],
  );

  const validation = useMemo(() => {
    if (!preview) return null;
    const checks = [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "budget", label: "Budget" },
    ] as const;
    const fields = checks
      .filter((check) => keys.includes(check.key))
      .map((check) => {
        const rows = filteredCalls.filter((call) => {
          const lead = preview.leadByCall.get(call.id);
          const value = lead?.[check.key];
          return value === null || value === undefined || String(value).trim() === "";
        });
        return {
          ...check,
          rows: rows.map((call) => {
            const lead = preview.leadByCall.get(call.id);
            return lead?.name?.trim() || lead?.phone?.trim() || `Call ${call.id.slice(0, 8)}`;
          }),
        };
      })
      .filter((field) => field.rows.length > 0);
    return { total: filteredCalls.length, fields };
  }, [preview, keys, filteredCalls]);


  async function loadPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      setPreview(await source());
    } catch (error) {
      setPreview(null);
      setPreviewError(error instanceof Error ? error.message : "Could not load the preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) void loadPreview();
    else {
      setPreview(null);
      setPreviewError(null);
    }
  }

  const toggle = (key: string, on: boolean) =>
    setKeys((prev) => (on ? [...prev, key] : prev.filter((k) => k !== key)));


  async function run(kind: "leads" | "transcripts" | "xlsx") {
    if (kind !== "transcripts" && keys.length === 0) {
      toast.error("Pick at least one column to export");
      return;
    }
    setBusy(kind);
    try {
      const { calls, leadByCall } = await source();
      const selected = calls.filter((call) => {
        const band = leadByCall.get(call.id)?.score_band;
        if (!band) return false;
        return bands[band as "hot" | "warm" | "cold"] ?? false;
      });
      if (selected.length === 0) {
        toast.error("No leads match the selected score bands");
        return;
      }
      if (kind === "leads") downloadLeadsCsv(selected, leadByCall, keys);
      else if (kind === "xlsx") downloadLeadsXlsx(selected, leadByCall, keys, undefined, includeTranscripts);
      else downloadTranscriptsCsv(selected, leadByCall);
      toast.success(`${selected.length} call${selected.length === 1 ? "" : "s"} exported`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export the file");
    } finally {
      setBusy(null);
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={disabled}>
          <Download className="size-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">

        <DialogHeader>
          <DialogTitle>Export leads (CSV or XLSX)</DialogTitle>
          <DialogDescription>
            {typeof count === "number"
              ? `${count} call${count === 1 ? "" : "s"} ${scopeLabel ?? "will be exported"}.`
              : (scopeLabel ?? "Choose the columns you want in the spreadsheet.")}{" "}
            Pick the columns below — summary sections and lead scores included.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Badge variant="secondary">{keys.length} columns selected</Badge>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setKeys(LEAD_EXPORT_COLUMNS.map((c) => c.key))}
            >
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setKeys(DEFAULT_EXPORT_COLUMN_KEYS)}>
              Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setKeys([])}>
              None
            </Button>
          </div>
        </div>

        <ScrollArea className="h-72 rounded-lg border border-border/60 p-3">
          <div className="space-y-4">
            {grouped.map(({ group, columns }) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {columns.map((column) => (
                    <div key={column.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${column.key}`}
                        checked={keys.includes(column.key)}
                        onCheckedChange={(v) => toggle(column.key, v === true)}
                      />
                      <Label htmlFor={`col-${column.key}`} className="text-sm font-normal">
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Score band filter
            </p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBands({ hot: true, warm: true, cold: true })}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBands({ hot: true, warm: false, cold: false })}
              >
                Hot only
              </Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            {(["hot", "warm", "cold"] as const).map((band) => (
              <div key={band} className="flex items-center gap-2">
                <Checkbox
                  id={`band-${band}`}
                  checked={bands[band]}
                  onCheckedChange={(v) =>
                    setBands((prev) => ({ ...prev, [band]: v === true }))
                  }
                />
                <Label htmlFor={`band-${band}`} className="text-sm font-normal capitalize">
                  {band}
                </Label>
              </div>
            ))}
          </div>
          {preview && (
            <p className="mt-2 text-xs text-muted-foreground">
              {filteredCalls.length} of {preview.calls.length} selected leads match the score-band
              filter.
            </p>
          )}
        </div>

        <div className="space-y-2">

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="preview-limit" className="text-xs font-normal text-muted-foreground">
                Show rows:
              </Label>
              <Select
                value={String(previewLimit)}
                onValueChange={(v) => setPreviewLimit(Number(v))}
                disabled={previewLoading || !preview}
              >
                <SelectTrigger id="preview-limit" className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREVIEW_LIMIT_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border border-border/60">
            {previewLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Building preview…
              </div>
            ) : previewError ? (
              <p className="p-4 text-sm text-destructive">{previewError}</p>
            ) : !preview || filteredCalls.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {preview?.calls.length === 0
                  ? "No rows to preview yet."
                  : "No leads match the selected score bands."}
              </p>
            ) : (

              <ScrollArea className="max-h-52 w-full">

                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
                        Score band
                      </th>
                      {selectedColumns
                        .filter((column) => column.key !== "score_band")
                        .map((column) => (
                          <th
                            key={column.key}
                            className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground"
                          >
                            {column.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalls.slice(0, previewLimit).map((call) => {
                      const lead = preview.leadByCall.get(call.id);

                      const band = lead?.score_band;
                      return (
                        <tr key={call.id} className="border-t border-border/50">
                          <td className="px-3 py-2">
                            {band ? (
                              <Badge
                                variant={
                                  band === "hot"
                                    ? "destructive"
                                    : band === "warm"
                                      ? "default"
                                      : "secondary"
                                }
                                className="capitalize"
                              >
                                {band}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          {selectedColumns
                            .filter((column) => column.key !== "score_band")
                            .map((column) => {
                              const value = column.value(call, lead);
                              const text =
                                value === null || value === undefined
                                  ? ""
                                  : Array.isArray(value)
                                    ? value.join("; ")
                                    : typeof value === "object"
                                      ? JSON.stringify(value)
                                      : String(value);
                              return (
                                <td
                                  key={column.key}
                                  className="max-w-[16rem] truncate px-3 py-2"
                                  title={text}
                                >
                                  {text || "—"}
                                </td>
                              );
                            })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="explain-signals"
              checked={explainSignals}
              onCheckedChange={(v) => setExplainSignals(v === true)}
            />
            <Label htmlFor="explain-signals" className="text-xs font-normal">
              Explain why each signal added or removed points
            </Label>
          </div>

          {explainSignals && preview && preview.calls.length > 0 ? (
            <ScrollArea className="max-h-60 rounded-lg border border-border/60">
              <div className="divide-y divide-border/50">
                {preview.calls.slice(0, previewLimit).map((call) => {
                  const lead = preview.leadByCall.get(call.id);
                  const entries = explainScoreReasons(lead?.score_reasons);
                  return (
                    <div key={call.id} className="space-y-1.5 p-3 text-xs">
                      <p className="font-semibold text-foreground">
                        {lead?.name?.trim() || lead?.phone?.trim() || `Call ${call.id.slice(0, 8)}`}
                        {lead?.score !== null && lead?.score !== undefined ? (
                          <span className="ml-2 font-normal text-muted-foreground">
                            {lead.score}/100 · {lead.score_band ?? "—"}
                          </span>
                        ) : null}
                      </p>
                      {entries.length === 0 ? (
                        <p className="text-muted-foreground">No scoring signals recorded.</p>
                      ) : (
                        entries.map((entry) => (
                          <p key={entry.signal} className="text-muted-foreground">
                            <span
                              className={
                                entry.points > 0
                                  ? "font-medium text-emerald-500"
                                  : entry.points < 0
                                    ? "font-medium text-destructive"
                                    : "font-medium text-foreground"
                              }
                            >
                              {entry.signal} {entry.points >= 0 ? "+" : ""}
                              {entry.points}
                            </span>{" "}
                            — {entry.explanation}
                          </p>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : null}
        </div>


        {validation ? (
          <div className="rounded-lg border border-border/60 p-3 text-xs">
            {validation.fields.length === 0 ? (
              <p className="text-muted-foreground">
                All {validation.total} row{validation.total === 1 ? "" : "s"} have name, phone and
                budget filled — no blanks expected.
              </p>
            ) : (
              <div className="space-y-1.5">
                <p className="font-semibold uppercase tracking-wide text-muted-foreground">
                  Validation — missing fields
                </p>
                {validation.fields.map((field) => (
                  <p key={field.key} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{field.label}</span> blank in{" "}
                    {field.rows.length} of {validation.total}:{" "}
                    <span className="text-foreground/80">
                      {field.rows.slice(0, 4).join(", ")}
                      {field.rows.length > 4 ? ` +${field.rows.length - 4} more` : ""}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onClick={() => void run("transcripts")}
          >
            {busy === "transcripts" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}{" "}
            Transcripts CSV
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-transcripts"
                checked={includeTranscripts}
                onCheckedChange={(v) => setIncludeTranscripts(v === true)}
              />
              <Label htmlFor="include-transcripts" className="text-sm font-normal whitespace-nowrap">
                Include Transcripts sheet
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void run("xlsx")}
            >
              {busy === "xlsx" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}{" "}
              Download XLSX
            </Button>
            <Button size="sm" disabled={busy !== null} onClick={() => void run("leads")}>
              {busy === "leads" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}{" "}
              Download leads CSV
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
