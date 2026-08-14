import { ALL } from "@/lib/leads-search";

export const ADMIN_SORTS = ["recent", "oldest", "score_desc", "score_asc", "status_asc"] as const;
export type AdminSort = (typeof ADMIN_SORTS)[number];

/**
 * Filter/search state for the admin transcript viewer, persisted in the URL.
 * Every field is optional so links to /admin don't need to spell out defaults —
 * empty/default values are stripped from the query string.
 */
export type AdminSearch = {
  q?: string | undefined;
  status?: string | undefined;
  band?: string | undefined;
  sort?: AdminSort | undefined;
  from?: string | undefined;
  to?: string | undefined;
  /** Selected call id, so a shared link reopens the same transcript. */
  call?: string | undefined;
  /** Saved preset name from a shared link; applied then removed from the URL. */
  preset?: string | undefined;
};

export const adminDefaults = {
  q: "",
  status: ALL,
  band: ALL,
  sort: "recent" as AdminSort,
  from: "",
  to: "",
  call: "",
  preset: "",
};


function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function keep(value: string, fallback: string): string | undefined {
  return value && value !== fallback ? value : undefined;
}

export function validateAdminSearch(search: Record<string, unknown>): AdminSearch {
  const sort = str(search["sort"]) as AdminSort;
  return {
    q: keep(str(search["q"]), ""),
    status: keep(str(search["status"]), ALL),
    band: keep(str(search["band"]), ALL),
    sort: ADMIN_SORTS.includes(sort) && sort !== "recent" ? sort : undefined,
    from: keep(str(search["from"]), ""),
    to: keep(str(search["to"]), ""),
    call: keep(str(search["call"]), ""),
    preset: keep(str(search["preset"]), ""),
  };
}

