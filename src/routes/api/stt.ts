import { createFileRoute } from "@tanstack/react-router";

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

          const text = await transcribe(file);
          return Response.json({ text });
        } catch (error) {
          return gatewayErrorResponse(error);
        }
      },
    },
  },
});
