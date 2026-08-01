import { createFileRoute } from "@tanstack/react-router";

import { agentTurn } from "@/lib/agent/agent-turn.server";
import { gatewayErrorResponse } from "@/lib/ai.server";
import type { Turn } from "@/lib/agent/prompt";

type Body = { history?: Turn[]; userText?: string };

export const Route = createFileRoute("/api/turn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;
          const history = Array.isArray(body.history) ? body.history : [];
          const userText = typeof body.userText === "string" ? body.userText : "";
          const result = await agentTurn(history, userText);
          return Response.json(result);
        } catch (error) {
          return gatewayErrorResponse(error);
        }
      },
    },
  },
});
