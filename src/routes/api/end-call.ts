import { createFileRoute } from "@tanstack/react-router";

import { chat, gatewayErrorResponse } from "@/lib/ai.server";
import { summaryPrompt, type LeadFields, type Turn } from "@/lib/agent/prompt";

type Body = {
  transcript?: Turn[];
  lead?: Partial<LeadFields>;
  language?: string;
  channel?: string;
};

export const Route = createFileRoute("/api/end-call")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;
          const transcript = Array.isArray(body.transcript) ? body.transcript : [];
          if (transcript.length === 0) {
            return Response.json({ error: "Empty transcript" }, { status: 400 });
          }

          let summary = "";
          try {
            summary = (
              await chat([{ role: "user", content: summaryPrompt(transcript) }])
            ).trim();
          } catch (error) {
            console.error("[end-call] summary failed", error);
            summary = "Summary could not be generated for this call.";
          }

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

          const lead = body.lead ?? {};
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
          });

          if (leadError) {
            console.error("[end-call] lead insert failed", leadError);
            return Response.json(
              { error: "Call saved but the lead could not be stored" },
              { status: 500 },
            );
          }

          return Response.json({ callId: call.id, summary });
        } catch (error) {
          return gatewayErrorResponse(error);
        }
      },
    },
  },
});
