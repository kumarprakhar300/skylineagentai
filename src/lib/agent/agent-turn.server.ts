import { chat } from "@/lib/ai.server";
import { readCatalog } from "@/lib/catalog.server";
import { languageInstruction, type SpokenLanguage } from "@/lib/agent/language";
import { emptyLead, systemPrompt, type LeadFields, type Turn } from "@/lib/agent/prompt";


export type AgentTurnResult = {
  reply: string;
  language: string;
  lead: LeadFields;
  shouldEnd: boolean;
};

type AgentJson = {
  reply?: string;
  language?: string;
  lead?: Partial<LeadFields>;
  should_end?: boolean;
};

function parseJson(raw: string): AgentJson {
  try {
    return JSON.parse(raw) as AgentJson;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]) as AgentJson;
    } catch {
      return {};
    }
  }
}

/** One conversational turn. Shared by the browser demo and the Twilio phone demo. */
export async function agentTurn(
  history: Turn[],
  userText: string,
  preferredLanguage: SpokenLanguage = "auto",
): Promise<AgentTurnResult> {
  const messages = [
    {
      role: "system" as const,
      content: `${systemPrompt(await readCatalog())}\n\n${languageInstruction(preferredLanguage)}`,
    },
    ...history.slice(-24).map((t) => ({
      role: t.role === "user" ? ("user" as const) : ("assistant" as const),
      content: t.content,
    })),
  ];


  if (userText.trim()) {
    messages.push({ role: "user", content: userText.trim() });
  } else if (history.length === 0) {
    messages.push({
      role: "user",
      content: "[The customer just picked up the phone. Open the call.]",
    });
  }

  const raw = await chat(messages, { json: true });
  const parsed = parseJson(raw);

  const reply =
    typeof parsed.reply === "string" && parsed.reply.trim()
      ? parsed.reply.trim()
      : raw.trim() || "Sorry, mujhe theek se sunai nahi diya. Kya aap dobara bata sakte hain?";

  const lead: LeadFields = { ...emptyLead };
  for (const key of Object.keys(lead) as (keyof LeadFields)[]) {
    const value = parsed.lead?.[key];
    lead[key] = typeof value === "string" && value.trim() ? value.trim() : null;
  }

  return {
    reply,
    language:
      preferredLanguage !== "auto"
        ? preferredLanguage
        : typeof parsed.language === "string"
          ? parsed.language
          : "hinglish",

    lead,
    shouldEnd: parsed.should_end === true,
  };
}
