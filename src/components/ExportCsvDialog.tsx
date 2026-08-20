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
  DEFAULT_EXPORT_COLUMN_KEYS,
  LEAD_EXPORT_COLUMNS,
  downloadLeadsCsv,
  downloadTranscriptsCsv,
} from "@/lib/leads-export";
import type { CallRow, LeadRow } from "@/lib/leads-types";
import { downloadLeadsXlsx } from "@/lib/xlsx-export";

type Source = () => Promise<{ calls: CallRow[]; leadByCall: Map<string, LeadRow> }>;

const GROUPS = ["Call", "Lead", "Score", "Pipeline", "Summary sections"] as const;

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
        const rows = preview.calls.filter((call) => {
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
    return { total: preview.calls.length, fields };
  }, [preview, keys]);

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
      if (calls.length === 0) {
        toast.error("No calls to export yet");
        return;
      }
      if (kind === "leads") downloadLeadsCsv(calls, leadByCall, keys);
      else if (kind === "xlsx") downloadLeadsXlsx(calls, leadByCall, keys, undefined, includeTranscripts);
      else downloadTranscriptsCsv(calls, leadByCall);
      toast.success(`${calls.length} call${calls.length === 1 ? "" : "s"} exported`);
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <span className="text-xs text-muted-foreground">
              {previewLoading
                ? "Loading…"
                : preview
                  ? `First ${Math.min(5, preview.calls.length)} of ${preview.calls.length} row${preview.calls.length === 1 ? "" : "s"}`
                  : ""}
            </span>
          </div>
          <div className="rounded-lg border border-border/60">
            {previewLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Building preview…
              </div>
            ) : previewError ? (
              <p className="p-4 text-sm text-destructive">{previewError}</p>
            ) : !preview || preview.calls.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No rows to preview yet.</p>
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
                    {preview.calls.slice(0, 5).map((call) => {
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
        </div>


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
