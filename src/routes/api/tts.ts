import { createFileRoute } from "@tanstack/react-router";

import { gatewayErrorResponse, speak } from "@/lib/ai.server";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { text?: string };
          const text = typeof body.text === "string" ? body.text.trim() : "";
          if (!text) {
            return Response.json({ error: "No text provided" }, { status: 400 });
          }

          const audio = await speak(text.slice(0, 1500));
          return new Response(audio, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          return gatewayErrorResponse(error);
        }
      },
    },
  },
});
