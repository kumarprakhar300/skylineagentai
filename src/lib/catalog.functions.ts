import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ProjectCatalog } from "@/lib/agent/project";

const configurationSchema = z.object({
  type: z.string().trim().min(1).max(60),
  carpet: z.string().trim().max(60).default(""),
  price: z.string().trim().max(120).default(""),
});

const catalogSchema = z.object({
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
});

const saveSchema = z.object({
  passcode: z.string().min(1).max(200),
  catalog: catalogSchema,
});

/** Public read — the catalog is shown on the demo pages. */
export const getProjectCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectCatalog> => {
    const { readCatalog } = await import("@/lib/catalog.server");
    return readCatalog();
  },
);

/** Verifies the admin passcode before returning the catalog for editing. */
export const unlockProjectCatalog = createServerFn({ method: "POST" })
  .inputValidator((data: { passcode: string }) => z.object({ passcode: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const { passcodeIsValid, readCatalog } = await import("@/lib/catalog.server");
    if (!passcodeIsValid(data.passcode)) return { ok: false as const };
    return { ok: true as const, catalog: await readCatalog() };
  });

export const saveProjectCatalog = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data }) => {
    const { passcodeIsValid, writeCatalog } = await import("@/lib/catalog.server");
    if (!passcodeIsValid(data.passcode)) return { ok: false as const, error: "Invalid passcode" };
    try {
      await writeCatalog(data.catalog as ProjectCatalog);
      return { ok: true as const };
    } catch (error) {
      console.error("[catalog] save failed", error);
      return { ok: false as const, error: "Could not save the catalog" };
    }
  });
