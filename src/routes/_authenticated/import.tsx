import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
import {
  autoMapping,
  buildImportRows,
  IMPORT_FIELDS,
  parseLeadFile,
  type SheetTable,
} from "@/lib/lead-import";
import { leadsDefaultSearch, statusLabel } from "@/lib/leads-search";
import { cn } from "@/lib/utils";

const NONE = "__none__";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Import Leads from CSV or XLSX — Skyline Estates AI Agent" },
      {
        name: "description",
        content:
          "Upload a CSV or XLSX file of real estate leads and map each column to the same fields the leads export uses, then import them into the pipeline.",
      },
      { property: "og:title", content: "Import leads from a spreadsheet" },
      {
        property: "og:description",
        content: "Map CSV/XLSX columns to the export fields and import leads straight into the pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImportLeads,
});

function ImportLeads() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<SheetTable | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  const built = useMemo(
    () => (table ? buildImportRows(table, mapping) : { rows: [], issues: [] }),
    [table, mapping],
  );

  const mappedFields = new Set(Object.values(mapping));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setImported(null);
    try {
      const parsed = await parseLeadFile(file);
      if (parsed.headers.length === 0) {
        toast.error("That file has no header row we could read.");
        return;
      }
      setFileName(file.name);
      setTable(parsed);
      setMapping(autoMapping(parsed.headers));
      toast.success(`Loaded ${parsed.rows.length} row${parsed.rows.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file");
    } finally {
      setParsing(false);
    }
  }

  function setColumn(index: number, field: string) {
    setMapping((prev) => {
      const next = { ...prev };
      // A field can only come from one column.
      for (const [col, value] of Object.entries(next)) {
        if (value === field) delete next[col];
      }
      if (field === NONE) delete next[String(index)];
      else next[String(index)] = field;
      return next;
    });
  }

  async function runImport() {
    if (built.rows.length === 0) return;
    setImporting(true);
    try {
      const payload = built.rows.map((r) => r.lead);
      const { error, count } = await supabase
        .from("leads")
        .insert(payload as never, { count: "exact" });
      if (error) throw error;
      setImported(count ?? payload.length);
      toast.success(`Imported ${count ?? payload.length} leads`);
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const previewRows = built.rows.slice(0, 8);

  return (
    <PageShell
      eyebrow="Import"
      title={<>Bring leads in from a spreadsheet</>}
      description="Upload a CSV or XLSX file — including one exported from this dashboard — map each column to a lead field, then import. Missing scores are recalculated from the captured requirements."
    >
      <Card className="panel-3d p-4 sm:p-5">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => inputRef.current?.click()} disabled={parsing}>
            <Upload className="size-4" /> {parsing ? "Reading file…" : "Choose CSV or XLSX"}
          </Button>
          {fileName && (
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-4 shrink-0" />
              <span className="truncate">{fileName}</span>
              <Badge variant="secondary">{table?.rows.length ?? 0} rows</Badge>
            </span>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Recognised headers map themselves: {IMPORT_FIELDS.map((f) => f.label).join(", ")}.
        </p>
      </Card>

      {table && (
        <>
          <Card className="panel-3d p-4 sm:p-5">
            <p className="text-sm font-semibold tracking-tight">Column mapping</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick the lead field each spreadsheet column should fill. Unmapped columns are ignored.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {table.headers.map((header, index) => {
                const current = mapping[String(index)] ?? NONE;
                const sample = table.rows.find((r) => (r[index] ?? "").trim() !== "")?.[index] ?? "";
                return (
                  <div key={`${header}-${index}`}>
                    <Label className="truncate text-xs text-muted-foreground">
                      {header || `Column ${index + 1}`}
                    </Label>
                    <Select value={current} onValueChange={(v) => setColumn(index, v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Ignore this column</SelectItem>
                        {IMPORT_FIELDS.map((field) => (
                          <SelectItem
                            key={field.key}
                            value={field.key}
                            disabled={mappedFields.has(field.key) && current !== field.key}
                          >
                            {field.group} — {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sample && (
                      <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">e.g. {sample}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="panel-3d p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">Preview</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {built.rows.length} lead{built.rows.length === 1 ? "" : "s"} ready
                  {built.issues.length > 0 && ` · ${built.issues.length} row note(s)`}
                </p>
              </div>
              <Button onClick={() => void runImport()} disabled={importing || built.rows.length === 0}>
                {importing ? "Importing…" : `Import ${built.rows.length} leads`}
              </Button>
            </div>

            {built.rows.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[46rem] text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      {["Row", "Name", "Phone", "Location", "Budget", "Timeline", "Score", "Stage"].map(
                        (h) => (
                          <th key={h} className="border-b border-border/70 px-2 py-2 font-medium">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map(({ row, lead }) => (
                      <tr key={row} className="align-top">
                        <td className="border-b border-border/40 px-2 py-2 text-muted-foreground">{row}</td>
                        <td className="border-b border-border/40 px-2 py-2">{lead.name ?? "—"}</td>
                        <td className="border-b border-border/40 px-2 py-2">{lead.phone ?? "—"}</td>
                        <td className="border-b border-border/40 px-2 py-2">{lead.location ?? "—"}</td>
                        <td className="border-b border-border/40 px-2 py-2">{lead.budget ?? "—"}</td>
                        <td className="border-b border-border/40 px-2 py-2">{lead.timeline ?? "—"}</td>
                        <td className="border-b border-border/40 px-2 py-2">
                          {lead.score ?? 0} · {lead.score_band}
                        </td>
                        <td className="border-b border-border/40 px-2 py-2">{statusLabel(lead.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {built.rows.length > previewRows.length && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing the first {previewRows.length} of {built.rows.length} rows.
                  </p>
                )}
              </div>
            )}

            {built.issues.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {built.issues.slice(0, 10).map((issue, i) => (
                  <li key={`${issue.row}-${i}`} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    Row {issue.row}: {issue.message}
                  </li>
                ))}
              </ul>
            )}

            {imported !== null && (
              <div
                className={cn(
                  "mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm",
                )}
              >
                <CheckCircle2 className="size-4 text-primary" />
                Imported {imported} leads.
                <Button asChild size="sm" variant="outline">
                  <Link to="/leads" search={leadsDefaultSearch}>
                    Open leads
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/pipeline">View pipeline</Link>
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </PageShell>
  );
}
