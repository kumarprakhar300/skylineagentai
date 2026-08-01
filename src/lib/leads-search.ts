export const ALL = "all";

export type LeadsSearch = {
  q: string;
  band: string;
  status: string;
  sort: string;
  location: string;
  budget: string;
  from: string;
  to: string;
};

export const leadsDefaultSearch: LeadsSearch = {
  q: "",
  location: ALL,
  budget: ALL,
  band: ALL,
  status: ALL,
  sort: "recent",
  from: "",
  to: "",
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateLeadsSearch(search: Record<string, unknown>): LeadsSearch {
  return {
    q: str(search["q"]),
    band: str(search["band"]) || ALL,
    status: str(search["status"]) || ALL,
    sort: str(search["sort"]) === "score" ? "score" : "recent",
    location: str(search["location"]) || ALL,
    budget: str(search["budget"]) || ALL,
    from: str(search["from"]),
    to: str(search["to"]),
  };
}

export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "visit_booked", label: "Visit booked" },
  { value: "won", label: "Closed / won" },
  { value: "dropped", label: "Dropped" },
] as const;

export function statusLabel(value: string | null | undefined): string {
  return LEAD_STATUSES.find((s) => s.value === value)?.label ?? "New";
}
