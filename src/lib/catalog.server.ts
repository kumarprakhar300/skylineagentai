import { createHash, timingSafeEqual } from "node:crypto";

import {
  defaultProjects,
  type Configuration,
  type ProjectCatalog,
} from "@/lib/agent/project";

type CatalogRow = {
  id: string;
  city: string;
  name: string;
  developer: string;
  location: string;
  status: string;
  rera_note: string;
  price_range: string;
  possession: string;
  payment_note: string;
  site_visit_note: string;
  configurations: unknown;
  amenities: unknown;
  location_advantages: unknown;
  benefits: unknown;
  sort_order: number;
};

const SELECT_COLUMNS =
  "id, city, name, developer, location, status, rera_note, price_range, possession, payment_note, site_visit_note, configurations, amenities, location_advantages, benefits, sort_order";

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function toConfigurations(value: unknown): Configuration[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      return {
        type: typeof item['type'] === "string" ? item['type'].trim() : "",
        carpet: typeof item['carpet'] === "string" ? item['carpet'].trim() : "",
        price: typeof item['price'] === "string" ? item['price'].trim() : "",
      };
    })
    .filter((c) => c.type.length > 0);
}

function rowToCatalog(row: CatalogRow): ProjectCatalog {
  return {
    id: row.id,
    city: row.city ?? "",
    name: row.name,
    developer: row.developer,
    location: row.location,
    status: row.status,
    reraNote: row.rera_note,
    priceRange: row.price_range,
    possession: row.possession,
    paymentNote: row.payment_note,
    siteVisitNote: row.site_visit_note,
    configurations: toConfigurations(row.configurations),
    amenities: toStringList(row.amenities),
    locationAdvantages: toStringList(row.location_advantages),
    benefits: toStringList(row.benefits),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

export function catalogToRow(catalog: ProjectCatalog) {
  return {
    city: catalog.city,
    name: catalog.name,
    developer: catalog.developer,
    location: catalog.location,
    status: catalog.status,
    rera_note: catalog.reraNote,
    price_range: catalog.priceRange,
    possession: catalog.possession,
    payment_note: catalog.paymentNote,
    site_visit_note: catalog.siteVisitNote,
    configurations: catalog.configurations as unknown as never,
    amenities: catalog.amenities as unknown as never,
    location_advantages: catalog.locationAdvantages as unknown as never,
    benefits: catalog.benefits as unknown as never,
    sort_order: catalog.sortOrder ?? 0,
  };
}

/** Reads every live project. Falls back to the bundled demo values on failure. */
export async function readCatalog(): Promise<ProjectCatalog[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("project_catalog")
      .select(SELECT_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.error("[catalog] read failed", error);
      return defaultProjects;
    }
    return (data as unknown as CatalogRow[]).map(rowToCatalog);
  } catch (error) {
    console.error("[catalog] read threw", error);
    return defaultProjects;
  }
}

/** Creates or updates a single project. */
export async function writeCatalog(catalog: ProjectCatalog): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const row = catalogToRow(catalog);

  if (catalog.id) {
    const { error } = await supabaseAdmin
      .from("project_catalog")
      .update(row)
      .eq("id", catalog.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.from("project_catalog").insert(row);
  if (error) throw error;
}

export async function deleteCatalogProject(id: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("project_catalog").delete().eq("id", id);
  if (error) throw error;
}

/** Timing-safe comparison of the admin passcode against the server secret. */
export function passcodeIsValid(input: string): boolean {
  const expected = process.env["ADMIN_PASSCODE"];
  if (!expected) {
    console.error("[catalog] ADMIN_PASSCODE is not configured");
    return false;
  }
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}
