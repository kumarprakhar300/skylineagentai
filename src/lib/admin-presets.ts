import type { AdminSearch } from "@/lib/admin-search";

export type AdminPreset = {
  id: string;
  name: string;
  filters: AdminSearch;
  /** Built-in presets ship with the app and cannot be deleted. */
  builtin?: boolean;
};

/** Filter keys a preset controls — `call` (the open transcript) is never saved. */
const KEYS = ["q", "status", "band", "sort", "from", "to"] as const;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Presets that are always available, computed fresh so dates stay relative. */
export function builtinPresets(): AdminPreset[] {
  return [
    { id: "builtin:hot", name: "Hot leads", filters: { band: "hot", sort: "score_desc" }, builtin: true },
    { id: "builtin:today", name: "Today's calls", filters: { from: todayISO() }, builtin: true },
    {
      id: "builtin:week",
      name: "Last 7 days",
      filters: { from: daysAgoISO(7), sort: "recent" },
      builtin: true,
    },
    { id: "builtin:new", name: "Needs follow-up", filters: { status: "new" }, builtin: true },
    {
      id: "builtin:visits",
      name: "Visits booked",
      filters: { status: "visit_booked", sort: "score_desc" },
      builtin: true,
    },
  ];
}

/** Only the filter keys, with empty/default values dropped. */
export function pickFilters(search: AdminSearch): AdminSearch {
  const out: AdminSearch = {};
  for (const key of KEYS) {
    const value = search[key];
    if (value) out[key] = value as never;
  }
  return out;
}

/** A patch that applies `filters` and clears every other filter key. */
export function presetPatch(filters: AdminSearch): AdminSearch {
  const out: AdminSearch = {};
  for (const key of KEYS) out[key] = (filters[key] || undefined) as never;
  return out;
}

/** Loose name match so shared links survive casing/spacing differences. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export function findPresetByName(name: string, presets: AdminPreset[]): AdminPreset | undefined {
  const wanted = normalizeName(name);
  return presets.find((p) => normalizeName(p.name) === wanted);
}

/**
 * Shareable link for a preset: the preset name plus its expanded filters, so
 * recipients get the same view even without that preset saved locally.
 */
export function presetShareUrl(preset: AdminPreset, origin: string, pathname = "/admin"): string {
  const params = new URLSearchParams();
  params.set("preset", preset.name);
  for (const key of KEYS) {
    const value = preset.filters[key];
    if (value) params.set(key, String(value));
  }
  return `${origin}${pathname}?${params.toString()}`;
}


export function filtersMatch(a: AdminSearch, b: AdminSearch): boolean {
  return KEYS.every((key) => (a[key] || "") === (b[key] || ""));
}

export function describeFilters(filters: AdminSearch): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`“${filters.q}”`);
  if (filters.status) parts.push(`status: ${filters.status}`);
  if (filters.band) parts.push(`score: ${filters.band}`);
  if (filters.from) parts.push(`from ${filters.from}`);
  if (filters.to) parts.push(`to ${filters.to}`);
  if (filters.sort) parts.push(`sort: ${filters.sort}`);
  return parts.join(" · ") || "No filters";
}

const STORAGE_KEY = "skyline.admin.filter-presets.v1";

export function loadPresets(): AdminPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AdminPreset =>
        !!item &&
        typeof item === "object" &&
        typeof (item as AdminPreset).id === "string" &&
        typeof (item as AdminPreset).name === "string",
    );
  } catch {
    return [];
  }
}

export function savePresets(presets: AdminPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* storage full or blocked — presets are a convenience only */
  }
}
