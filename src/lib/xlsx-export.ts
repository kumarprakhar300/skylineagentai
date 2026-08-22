import * as XLSX from "xlsx";

import { stamp } from "@/lib/csv";
import type { CallRow, LeadRow } from "@/lib/leads-types";
import { DEFAULT_EXPORT_COLUMN_KEYS, LEAD_EXPORT_COLUMNS } from "@/lib/leads-export";

function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return value as string | number | boolean;
}

/** Longest single line of a cell — multi-line cells shouldn't blow the column width out. */
function longestLine(value: unknown) {
  return String(value ?? "")
    .split("\n")
    .reduce((max, line) => Math.max(max, line.length), 0);
}

function autoWidth(rows: (string | number | boolean)[][]) {
  const widths: number[] = [];
  rows.forEach((row) =>
    row.forEach((value, i) => {
      widths[i] = Math.min(60, Math.max(widths[i] ?? 10, longestLine(value) + 2));
    }),
  );
  return widths.map((wch) => ({ wch }));
}

function sheetFrom(headers: string[], rows: unknown[][]) {
  const table = [headers, ...rows.map((row) => row.map(cell))] as (string | number | boolean)[][];
  const sheet = XLSX.utils.aoa_to_sheet(table);
  sheet["!cols"] = autoWidth(table);
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(0, table.length - 1), c: Math.max(0, headers.length - 1) },
    }),
  };
  sheet["!freeze"] = "A2";

  // Wrap text on any cell containing line breaks (Score explanation, breakdowns,
  // summaries) and grow the row height so every line is visible.
  const rowHeights: { hpt: number }[] = [];
  table.forEach((row, r) => {
    let lines = 1;
    row.forEach((value, c) => {
      const text = String(value ?? "");
      const cellLines = text.split("\n").length;
      const address = XLSX.utils.encode_cell({ r, c });
      const target = sheet[address];
      if (!target) return;
      if (cellLines > 1 || text.length > 60) {
        target.s = { ...(target.s ?? {}), alignment: { wrapText: true, vertical: "top" } };
      }
      lines = Math.max(lines, Math.min(12, cellLines));
    });
    rowHeights[r] = { hpt: Math.round(15 * lines) };
  });
  sheet["!rows"] = rowHeights;

  return sheet;
}


/** Download the filtered leads as a workbook. Optionally include a Transcripts sheet. */
export function downloadLeadsXlsx(
  calls: CallRow[],
  leadByCall: Map<string, LeadRow>,
  columnKeys: string[] = DEFAULT_EXPORT_COLUMN_KEYS,
  filename = `leads-${stamp()}.xlsx`,
  includeTranscripts = true,
) {
  const selected = LEAD_EXPORT_COLUMNS.filter((c) => columnKeys.includes(c.key));
  const columns = selected.length > 0 ? selected : LEAD_EXPORT_COLUMNS;

  const leadsSheet = sheetFrom(
    columns.map((c) => c.label),
    calls.map((call) => {
      const lead = leadByCall.get(call.id);
      return columns.map((c) => c.value(call, lead));
    }),
  );

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, leadsSheet, "Leads");

  if (includeTranscripts) {
    const turnRows: unknown[][] = [];
    calls.forEach((call) => {
      const lead = leadByCall.get(call.id);
      (call.transcript ?? []).forEach((turn, index) => {
        turnRows.push([
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

    XLSX.utils.book_append_sheet(
      book,
      sheetFrom(["Call ID", "Call date", "Name", "Phone", "Turn", "Speaker", "Message"], turnRows),
      "Transcripts",
    );
  }

  XLSX.writeFile(book, filename);
}
