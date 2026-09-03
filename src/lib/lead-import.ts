import { scoreLead } from "@/lib/agent/score";
import type { LeadRow } from "@/lib/leads-types";
import { LEAD_STATUSES } from "@/lib/leads-search";

/**
 * Importable lead fields. Keys and labels mirror the leads export columns so a
 * file exported from this app can be re-imported without renaming a thing.
 */
export type ImportField = {
  key: keyof ImportedLead;
  label: string;
  group: "Lead" | "Requirements" | "Score" | "Pipeline";
  /** Lower-cased header spellings that auto-map to this field. */
  aliases: string[];
};

export type ImportedLead = {
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
  status: string | null;
  owner_notes: string | null;
  callback_at: string | null;
  notes: string | null;
};

export const IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", group: "Lead", aliases: ["name", "customer", "customer name", "lead name"] },
  { key: "phone", label: "Phone", group: "Lead", aliases: ["phone", "mobile", "contact", "contact number", "number"] },
  { key: "intent", label: "Buy / invest", group: "Lead", aliases: ["intent", "buy / invest", "buy or invest"] },
  { key: "location", label: "Location", group: "Requirements", aliases: ["location", "preferred location", "city", "area"] },
  { key: "property_type", label: "Property type", group: "Requirements", aliases: ["property type", "property_type", "type"] },
  { key: "configuration", label: "Configuration", group: "Requirements", aliases: ["configuration", "config", "bhk"] },
  { key: "budget", label: "Budget", group: "Requirements", aliases: ["budget", "budget range", "price"] },
  { key: "purpose", label: "Purpose", group: "Requirements", aliases: ["purpose", "self-use or investment", "use"] },
  { key: "timeline", label: "Timeline", group: "Requirements", aliases: ["timeline", "purchase timeline", "when"] },
  { key: "score", label: "Lead score", group: "Score", aliases: ["lead score", "score"] },
  { key: "score_band", label: "Score band", group: "Score", aliases: ["score band", "score_band", "band"] },
  { key: "status", label: "Pipeline status", group: "Pipeline", aliases: ["pipeline status", "status", "stage"] },
  { key: "owner_notes", label: "Follow-up notes", group: "Pipeline", aliases: ["follow-up notes", "owner notes", "owner_notes", "notes"] },
  { key: "callback_at", label: "Callback at", group: "Pipeline", aliases: ["callback at", "callback_at", "callback"] },
  { key: "notes", label: "Extra notes", group: "Pipeline", aliases: ["extra notes", "remarks", "comment", "comments"] },
];

export type SheetTable = { headers: string[]; rows: string[][] };

/** RFC4180-ish CSV parser: handles quoted cells, escaped quotes and CRLF. */
export function parseCsv(text: string): SheetTable {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const headers = (nonEmpty.shift() ?? []).map((h) => stripFormulaGuard(h.trim()));
  return { headers, rows: nonEmpty.map((r) => r.map((c) => stripFormulaGuard(c.trim()))) };
}

/** Our CSV export prefixes formula-looking cells with an apostrophe; undo that. */
function stripFormulaGuard(value: string): string {
  return value.startsWith("'") ? value.slice(1) : value;
}

/** Parses the first sheet of an XLSX/XLS workbook into headers + rows. */
export async function parseWorkbook(file: File): Promise<SheetTable> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array" });
  const first = book.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  const sheet = book.Sheets[first];
  if (!sheet) return { headers: [], rows: [] };
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  const rows = matrix
    .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").trim()) : []))
    .filter((r) => r.some((c) => c !== ""));
  const headers = (rows.shift() ?? []).map(stripFormulaGuard);
  return { headers, rows: rows.map((r) => r.map(stripFormulaGuard)) };
}

export async function parseLeadFile(file: File): Promise<SheetTable> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseWorkbook(file);
  return parseCsv(await file.text());
}

/** Best-effort header → field mapping so most files need no manual work. */
export function autoMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const taken = new Set<string>();
  headers.forEach((header, index) => {
    const norm = header.trim().toLowerCase();
    const field = IMPORT_FIELDS.find(
      (f) => !taken.has(f.key) && (f.aliases.includes(norm) || f.label.toLowerCase() === norm),
    );
    if (field) {
      mapping[String(index)] = field.key;
      taken.add(field.key);
    }
  });
  return mapping;
}

const VALID_STATUSES = new Set(LEAD_STATUSES.map((s) => s.value));

function text(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export type RowIssue = { row: number; message: string };

export type BuiltRow = {
  /** Row number as shown to the user (1 = first data row). */
  row: number;
  lead: Partial<LeadRow>;
};

/**
 * Turns mapped spreadsheet rows into lead inserts. Missing scores are derived
 * from the captured requirement fields so imported leads still sort sensibly.
 */
export function buildImportRows(
  table: SheetTable,
  mapping: Record<string, string>,
): { rows: BuiltRow[]; issues: RowIssue[] } {
  const rows: BuiltRow[] = [];
  const issues: RowIssue[] = [];

  const columnFor = (key: string): number | null => {
    const entry = Object.entries(mapping).find(([, field]) => field === key);
    return entry ? Number(entry[0]) : null;
  };

  table.rows.forEach((cells, index) => {
    const rowNumber = index + 1;
    const get = (key: keyof ImportedLead): string | null => {
      const col = columnFor(key);
      return col === null ? null : text(cells[col]);
    };

    const core = {
      name: get("name"),
      phone: get("phone"),
      intent: get("intent"),
      location: get("location"),
      property_type: get("property_type"),
      configuration: get("configuration"),
      budget: get("budget"),
      purpose: get("purpose"),
      timeline: get("timeline"),
    };

    if (Object.values(core).every((v) => v === null)) {
      issues.push({ row: rowNumber, message: "Skipped — no mapped lead data in this row" });
      return;
    }

    const rawScore = get("score");
    const parsedScore = rawScore === null ? null : Number(rawScore.replace(/[^\d.-]/g, ""));
    const derived = scoreLead(core, []);

    let score = derived.score;
    let band = derived.band as string;
    let reasons: string[] = ["Imported from a spreadsheet", ...derived.reasons];

    if (parsedScore !== null && Number.isFinite(parsedScore)) {
      score = Math.max(0, Math.min(100, Math.round(parsedScore)));
      band = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
      reasons = ["Score imported from the uploaded file"];
    } else if (rawScore !== null) {
      issues.push({ row: rowNumber, message: `Score "${rawScore}" is not a number — recalculated` });
    }

    const importedBand = get("score_band")?.toLowerCase();
    if (importedBand && ["hot", "warm", "cold"].includes(importedBand)) band = importedBand;

    const rawStatus = get("status")?.toLowerCase().replace(/[\s/]+/g, "_");
    let status = "new";
    if (rawStatus) {
      if (VALID_STATUSES.has(rawStatus as never)) status = rawStatus;
      else issues.push({ row: rowNumber, message: `Unknown status "${rawStatus}" — set to New` });
    }

    const rawCallback = get("callback_at");
    let callback_at: string | null = null;
    if (rawCallback) {
      const parsed = new Date(rawCallback);
      if (Number.isNaN(parsed.getTime())) {
        issues.push({ row: rowNumber, message: `Callback date "${rawCallback}" not understood — ignored` });
      } else {
        callback_at = parsed.toISOString();
      }
    }

    const notes = [get("owner_notes"), get("notes")].filter(Boolean).join("\n") || null;

    rows.push({
      row: rowNumber,
      lead: {
        ...core,
        score,
        score_band: band,
        score_reasons: reasons,
        status,
        owner_notes: notes ?? "",
        callback_at,
      },
    });
  });

  return { rows, issues };
}
