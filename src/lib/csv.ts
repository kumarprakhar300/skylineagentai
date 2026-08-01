// Values starting with these characters are treated as formulas by Excel / Sheets.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  let text =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join(" | ")
        : String(value);

  text = text.replace(/"/g, '""').replace(/\r?\n/g, " ");

  // Neutralise CSV formula injection so exported leads can't run code in a spreadsheet.
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }

  return `"${text}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // BOM keeps Devanagari / Hinglish text readable when opened in Excel.
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}
