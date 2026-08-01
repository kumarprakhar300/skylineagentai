import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProjectCatalog } from "@/lib/agent/project";

const configurationSchema = z.object({
  type: z.string().trim().min(1).max(60),
  carpet: z.string().trim().max(60).default(""),
  price: z.string().trim().max(120).default(""),
});

const catalogSchema = z.object({
  id: z.string().uuid().optional(),
  city: z.string().trim().max(80).default(""),
  name: z.string().trim().min(1).max(120),
  developer: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(160),
  status: z.string().trim().max(160).default(""),
  reraNote: z.string().trim().max(300).default(""),
  priceRange: z.string().trim().max(200).default(""),
  possession: z.string().trim().max(160).default(""),
  paymentNote: z.string().trim().max(600).default(""),
  siteVisitNote: z.string().trim().max(300).default(""),
  configurations: z.array(configurationSchema).max(20).default([]),
  amenities: z.array(z.string().trim().min(1).max(160)).max(40).default([]),
  locationAdvantages: z.array(z.string().trim().min(1).max(160)).max(40).default([]),
  benefits: z.array(z.string().trim().min(1).max(240)).max(40).default([]),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

/** Public read — the catalog is shown on the public landing page. */
export const getProjectCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectCatalog[]> => {
    const { readCatalog } = await import("@/lib/catalog.server");
    return readCatalog();
  },
);

/** Admin-only read for the editor. */
export const loadCatalogForEditing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) return { ok: false as const, error: "Admin access required" };
    const { readCatalog } = await import("@/lib/catalog.server");
    return { ok: true as const, projects: await readCatalog() };
  });

export const saveProjectCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ catalog: catalogSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) return { ok: false as const, error: "Admin access required" };

    const { writeCatalog } = await import("@/lib/catalog.server");
    try {
      await writeCatalog(data.catalog as ProjectCatalog);
      return { ok: true as const };
    } catch (error) {
      console.error("[catalog] save failed", error);
      return { ok: false as const, error: "Could not save the project" };
    }
  });

export const deleteProjectFromCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) return { ok: false as const, error: "Admin access required" };

    const { deleteCatalogProject } = await import("@/lib/catalog.server");
    try {
      await deleteCatalogProject(data.id);
      return { ok: true as const };
    } catch (error) {
      console.error("[catalog] delete failed", error);
      return { ok: false as const, error: "Could not delete the project" };
    }
  });
