import { createFileRoute } from "@tanstack/react-router";

import { chat, gatewayErrorResponse } from "@/lib/ai.server";
import { emptyLead, systemPrompt, type LeadFields, type Turn } from "@/lib/agent/prompt";

type Body = { history?: Turn[]; userText?: string };

type AgentJson = {
  reply?: string;
  language?: string;
  lead?: Partial<LeadFields>;
  should_end?: boolean;
};

export const Route = createFileRoute("/api/turn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;
          const history = Array.isArray(body.history) ? body.history.slice(-24) : [];
          const userText = typeof body.userText === "string" ? body.userText.trim() : "";

          const messages = [
            { role: "system" as const, content: systemPrompt() },
            ...history.map((t) => ({
              role: t.role === "user" ? ("user" as const) : ("assistant" as const),
              content: t.content,
            })),
          ];

          if (userText) {
            messages.push({ role: "user", content: userText });
          } else if (history.length === 0) {
            messages.push({
              role: "user",
              content: "[The customer just picked up the phone. Open the call.]",
            });
          }

          const raw = await chat(messages, { json: true });

          let parsed: AgentJson = {};
          try {
            parsed = JSON.parse(raw) as AgentJson;
          } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                parsed = JSON.parse(match[0]) as AgentJson;
              } catch {
                parsed = {};
              }
            }
          }

          const reply =
            typeof parsed.reply === "string" && parsed.reply.trim()
              ? parsed.reply.trim()
              : raw.trim() ||
                "Sorry, mujhe theek se sunai nahi diya. Kya aap dobara bata sakte hain?";

          const lead: LeadFields = { ...emptyLead };
          for (const key of Object.keys(lead) as (keyof LeadFields)[]) {
            const value = parsed.lead?.[key];
            lead[key] = typeof value === "string" && value.trim() ? value.trim() : null;
          }

          return Response.json({
            reply,
            language: typeof parsed.language === "string" ? parsed.language : "hinglish",
            lead,
            shouldEnd: parsed.should_end === true,
          });
        } catch (error) {
          return gatewayErrorResponse(error);
        }
      },
    },
  },
});
