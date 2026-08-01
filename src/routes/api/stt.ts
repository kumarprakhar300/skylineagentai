import { createFileRoute } from "@tanstack/react-router";

import { normalizeLanguage, sttLanguageCode, sttPrompt } from "@/lib/agent/language";
import { cleanSpokenText } from "@/lib/agent/transcript-text";
import { gatewayErrorResponse, transcribe } from "@/lib/ai.server";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const file = form.get("audio");

          if (!(file instanceof File) || file.size === 0) {
            return Response.json({ error: "No audio uploaded" }, { status: 400 });
          }
          if (file.size > 20 * 1024 * 1024) {
            return Response.json({ error: "Recording too large" }, { status: 413 });
          }

          const language = normalizeLanguage(form.get("language"));
          const raw = await transcribe(file, {
            language: sttLanguageCode(language),
            prompt: sttPrompt(language),
          });
          return Response.json({ text: cleanSpokenText(raw) });
        } catch (error) {
          return gatewayErrorResponse(error);
        }
      },
    },
  },
});
