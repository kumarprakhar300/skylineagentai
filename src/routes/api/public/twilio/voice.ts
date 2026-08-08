import { createFileRoute } from "@tanstack/react-router";

import { agentTurn } from "@/lib/agent/agent-turn.server";
import { chat } from "@/lib/ai.server";
import { summaryPrompt, type LeadFields, type Turn } from "@/lib/agent/prompt";
import { scoreLead } from "@/lib/agent/score";
import { summaryScoreLine } from "@/lib/agent/summary";
import { twilioSignatureIsValid } from "@/lib/twilio-signature.server";


const DEVANAGARI = /[\u0900-\u097F]/;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function say(text: string) {
  const hindi = DEVANAGARI.test(text);
  return `<Say voice="${hindi ? "Polly.Aditi" : "Polly.Raveena"}" language="${
    hindi ? "hi-IN" : "en-IN"
  }">${escapeXml(text)}</Say>`;
}

function gather(text: string) {
  const hindi = DEVANAGARI.test(text);
  return `<Gather input="speech" language="${hindi ? "hi-IN" : "en-IN"}" speechTimeout="auto" speechModel="phone_call" enhanced="true" action="/api/public/twilio/voice" method="POST" actionOnEmptyResult="true">${say(
    text,
  )}</Gather>`;
}

export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authToken = process.env["TWILIO_AUTH_TOKEN"];
          if (!authToken) {
            console.error("[twilio] TWILIO_AUTH_TOKEN is not configured; rejecting webhook");
            return new Response("Webhook not configured", { status: 503 });
          }

          const form = await request.formData();

          // Verify the request really came from Twilio before touching the DB or paid AI calls.
          const params: Record<string, string> = {};
          for (const [key, value] of form.entries()) {
            if (typeof value === "string") params[key] = value;
          }
          const signature = request.headers.get("x-twilio-signature") ?? "";
          const url = new URL(request.url);
          url.protocol = "https:";
          url.port = "";
          if (!signature || !twilioSignatureIsValid(authToken, url.toString(), params, signature)) {
            console.warn("[twilio] rejected request with invalid signature");
            return new Response("Invalid signature", { status: 403 });
          }

          const callSid = String(form.get("CallSid") ?? "");
          const speech = String(form.get("SpeechResult") ?? "")
            .trim()
            .slice(0, 2000);
          const fromNumber = String(form.get("From") ?? "")
            .trim()
            .slice(0, 32);


          if (!callSid) {
            return twiml(say("Sorry, this call could not be connected."));
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const existing = await supabaseAdmin
            .from("calls")
            .select("id, transcript, draft_lead")
            .eq("external_id", callSid)
            .maybeSingle();

          let callId = existing.data?.id ?? null;
          const transcript: Turn[] = Array.isArray(existing.data?.transcript)
            ? (existing.data.transcript as unknown as Turn[])
            : [];

          if (!callId) {
            const created = await supabaseAdmin
              .from("calls")
              .insert({
                channel: "phone",
                external_id: callSid,
                status: "in_progress",
                transcript: [] as unknown as never,
              })
              .select("id")
              .single();
            if (created.error || !created.data) {
              console.error("[twilio] could not create call", created.error);
              return twiml(say("Sorry, we are unable to take this call right now. Goodbye."));
            }
            callId = created.data.id;
          }

          const result = await agentTurn(transcript, speech);

          const nextTranscript: Turn[] = [
            ...transcript,
            ...(speech ? [{ role: "user" as const, content: speech }] : []),
            { role: "assistant" as const, content: result.reply },
          ];

          const lead: LeadFields = {
            ...result.lead,
            phone: result.lead.phone ?? (fromNumber || null),
          };

          // No speech twice in a row, or the agent decided to close: end the call.
          const silentTurns = !speech && transcript.length > 0;
          const finish = result.shouldEnd || silentTurns || nextTranscript.length > 40;

          if (!finish) {
            await supabaseAdmin
              .from("calls")
              .update({
                transcript: nextTranscript as unknown as never,
                draft_lead: lead as unknown as never,
                language: result.language,
              })
              .eq("id", callId);

            return twiml(gather(result.reply));
          }

          let summary = "";
          try {
            summary = (await chat([{ role: "user", content: summaryPrompt(nextTranscript) }])).trim();
          } catch (error) {
            console.error("[twilio] summary failed", error);
            summary = "Summary could not be generated for this call.";
          }

          const score = scoreLead(lead, nextTranscript);
          summary = `${summary}\n${summaryScoreLine(score)}`;

          await supabaseAdmin
            .from("calls")
            .update({
              transcript: nextTranscript as unknown as never,
              draft_lead: lead as unknown as never,
              language: result.language,
              status: "completed",
              summary,
              ended_at: new Date().toISOString(),
            })
            .eq("id", callId);

          await supabaseAdmin.from("leads").insert({
            call_id: callId,
            name: lead.name,
            phone: lead.phone,
            intent: lead.intent,
            location: lead.location,
            property_type: lead.property_type,
            configuration: lead.configuration,
            budget: lead.budget,
            purpose: lead.purpose,
            timeline: lead.timeline,
            score: score.score,
            score_band: score.band,
            score_reasons: score.reasons as unknown as never,
            notes: summary,
          });

          return twiml(`${say(result.reply)}<Hangup/>`);
        } catch (error) {
          console.error("[twilio] handler failed", error);
          return twiml(
            say("Sorry, we are facing a technical issue. Our team will call you back. Goodbye."),
          );
        }
      },
    },
  },
});
