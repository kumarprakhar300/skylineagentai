import { ALL } from "@/lib/leads-search";

export const ADMIN_SORTS = ["recent", "oldest", "score_desc", "score_asc", "status_asc"] as const;
export type AdminSort = (typeof ADMIN_SORTS)[number];

/** Filter/search state for the admin transcript viewer, persisted in the URL. */
export type AdminSearch = {
  q: string;
  status: string;
  band: string;
  sort: AdminSort;
  from: string;
  to: string;
  /** Selected call id, so a shared link reopens the same transcript. */
  call: string;
};

export const adminDefaultSearch: AdminSearch = {
  q: "",
  status: ALL,
  band: ALL,
  sort: "recent",
  from: "",
  to: "",
  call: "",
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateAdminSearch(search: Record<string, unknown>): AdminSearch {
  const sort = str(search["sort"]) as AdminSort;
  return {
    q: str(search["q"]),
    status: str(search["status"]) || ALL,
    band: str(search["band"]) || ALL,
    sort: ADMIN_SORTS.includes(sort) ? sort : "recent",
    from: str(search["from"]),
    to: str(search["to"]),
    call: str(search["call"]),
  };
}
