import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BLOCKED_HOST = /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.internal$|metadata\.google\.internal$)/i;

const payloadSchema = z.object({
  url: z
    .string()
    .trim()
    .url()
    .max(2000)
    .refine((value) => {
      try {
        const parsed = new URL(value);
        if (parsed.protocol !== "https:") return false;
        return !BLOCKED_HOST.test(parsed.hostname);
      } catch {
        return false;
      }
    }, "Use a public https:// URL"),
  secret: z.string().trim().max(500).optional(),
  /** One NDJSON record per array item, already built on the client. */
  records: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
});

/**
 * POSTs each exported NDJSON record to a user-provided webhook URL.
 * Admin-only, https-only and private hosts are blocked to avoid SSRF.
 */
export const sendLeadsWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) return { ok: false as const, error: "Admin access required" };

    let sent = 0;
    const failures: { index: number; status: number | null; message: string }[] = [];

    for (const [index, record] of data.records.entries()) {
      try {
        const response = await fetch(data.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "skyline-agent-webhook/1",
            ...(data.secret ? { "x-webhook-secret": data.secret } : {}),
          },
          body: JSON.stringify(record),
          signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) sent += 1;
        else
          failures.push({
            index,
            status: response.status,
            message: (await response.text().catch(() => "")).slice(0, 200) || response.statusText,
          });
      } catch (error) {
        failures.push({
          index,
          status: null,
          message: error instanceof Error ? error.message : "Request failed",
        });
      }
    }

    return { ok: true as const, sent, total: data.records.length, failures: failures.slice(0, 5) };
  });
