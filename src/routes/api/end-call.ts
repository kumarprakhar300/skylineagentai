import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { chat, gatewayErrorResponse } from "@/lib/ai.server";
import { summaryPrompt, type LeadFields } from "@/lib/agent/prompt";
import { cleanSpokenText } from "@/lib/agent/transcript-text";
import { scoreLead } from "@/lib/agent/score";
import { summaryScoreLine } from "@/lib/agent/summary";

const leadField = z.string().trim().max(200).nullable().optional();

const bodySchema = z.object({
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(5000),
      }),
    )
    .max(200)
    .default([]),
  lead: z
    .object({
      name: leadField,
      phone: z.string().trim().max(32).nullable().optional(),
      intent: leadField,
      location: leadField,
      property_type: leadField,
      configuration: leadField,
      budget: leadField,
      purpose: leadField,
      timeline: leadField,
    })
    .partial()
    .default({}),
  language: z.string().trim().max(32).nullable().optional(),
  channel: z.enum(["browser", "phone"]).optional(),
});

export const Route = createFileRoute("/api/end-call")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = bodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Invalid request body" }, { status: 400 });
          }
          const body = parsed.data;

          // Store the same normalised text the caller saw in the live transcript.
          const transcript = body.transcript
            .map((turn) => ({ ...turn, content: cleanSpokenText(turn.content) }))
            .filter((turn) => turn.content.length > 0);
          if (transcript.length === 0) {
            return Response.json({ error: "Empty transcript" }, { status: 400 });
          }

          const lead = (body.lead ?? {}) as Partial<LeadFields>;
          const score = scoreLead(lead, transcript);


          let summary = "";
          try {
            summary = cleanSpokenText(
              await chat([{ role: "user", content: summaryPrompt(transcript) }]),
            );
          } catch (error) {
            console.error("[end-call] summary failed", error);
            summary = "Summary could not be generated for this call.";
          }
          summary = `${summary}\n${summaryScoreLine(score)}`;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: call, error: callError } = await supabaseAdmin
            .from("calls")
            .insert({
              channel: body.channel === "phone" ? "phone" : "browser",
              language: body.language ?? null,
              transcript: transcript as unknown as never,
              summary,
              status: "completed",
              ended_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (callError || !call) {
            console.error("[end-call] call insert failed", callError);
            return Response.json({ error: "Could not save the call" }, { status: 500 });
          }

          const { error: leadError } = await supabaseAdmin.from("leads").insert({
            call_id: call.id,
            name: lead.name ?? null,
            phone: lead.phone ?? null,
            intent: lead.intent ?? null,
            location: lead.location ?? null,
            property_type: lead.property_type ?? null,
            configuration: lead.configuration ?? null,
            budget: lead.budget ?? null,
            purpose: lead.purpose ?? null,
            timeline: lead.timeline ?? null,
            score: score.score,
            score_band: score.band,
            score_reasons: score.reasons as unknown as never,
          });

          if (leadError) {
            console.error("[end-call] lead insert failed", leadError);
            return Response.json(
              { error: "Call saved but the lead could not be stored" },
              { status: 500 },
            );
          }

          return Response.json({ callId: call.id, summary, score });
        } catch (error) {
          return gatewayErrorResponse(error);
        }
      },
    },
  },
});
