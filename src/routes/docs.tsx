import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { conversationStages } from "@/lib/agent/prompt";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "How the Real Estate AI Calling Agent Works — Architecture & Prompt" },
      {
        name: "description",
        content:
          "Architecture, conversation flow, language handling, interruption handling, lead extraction and limitations of the real estate AI voice calling agent.",
      },
      { property: "og:title", content: "How the AI calling agent works" },
      {
        property: "og:description",
        content:
          "Architecture, prompt design, qualification flow and honest limitations of the real estate AI voice agent.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

function Docs() {
  return (
    <PageShell
      eyebrow="Architecture"
      title="How it works"
      description="A single agent brain drives both the browser call and the Twilio phone call. Everything below is implemented in this app."
      width="narrow"
      header={false}
      backLink
    >


        <Section title="Voice loop (browser)">
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>
              1. The mic is captured with the Web Audio API and encoded to complete 16 kHz mono WAV
              chunks — recorder fragments are avoided because they break transcription.
            </li>
            <li>
              2. Silence detection (RMS threshold, ~1.5 s) ends the caller's turn automatically, so
              nobody has to press a button while talking.
            </li>
            <li>
              3. The WAV is transcribed, the transcript plus history goes to the agent, and the
              reply is spoken back with streaming-quality text-to-speech.
            </li>
            <li>
              4. <strong>Interruptions:</strong> pressing “Interrupt” cuts the agent's audio
              instantly and starts listening again; the agent also accepts corrections mid-flow
              (changed budget, changed location) and confirms the new value.
            </li>
          </ol>
        </Section>

        <Section title="Qualification flow">
          <ol className="space-y-2 text-sm text-muted-foreground">
            {conversationStages.map((stage, index) => (
              <li key={index}>
                {index + 1}. {stage}
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Language handling">
          <p className="text-sm text-muted-foreground">
            The agent mirrors the caller: Hindi answers get Hindi in Devanagari, mixed speech gets
            Hinglish in Latin script, English gets simple Indian English. The call opens in Hinglish
            because that is the most common register on Indian sales calls. The detected language is
            stored with the call record.
          </p>
        </Section>

        <Section title="Lead extraction & summary">
          <p className="text-sm text-muted-foreground">
            Every turn the model returns structured JSON — the spoken reply, the detected language,
            the requirement fields captured so far, and whether the call should close. The
            requirement panel on the call screen updates from that JSON live. On hang-up a separate
            model call writes the call summary, and the call, transcript, summary and lead are
            written to the database.
          </p>
        </Section>

        <Section title="Guardrails">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• No guaranteed returns, assured rent or appreciation promises.</li>
            <li>• Prices are always described as indicative and subject to change.</li>
            <li>• Nothing outside the project brief may be invented; unknowns go to the team.</li>
            <li>• If asked directly, the agent admits it is an AI assistant.</li>
          </ul>
        </Section>

        <Section title="Honest limitations">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• The project, prices, RERA number and possession dates are fictional demo data.</li>
            <li>
              • Turn-by-turn latency is roughly a second or two; a production system would stream
              speech-to-text and text-to-speech in parallel over a websocket.
            </li>
            <li>
              • Phone calls are inbound only, and use Twilio's speech recognition and Polly voices
              rather than the browser demo's higher-quality voice pipeline.
            </li>
            <li>• No CRM push, no follow-up SMS/WhatsApp, no authentication on the lead dashboard.</li>
            <li>• Five demo projects (one per metro city) are in the knowledge base, not a full live inventory.</li>
          </ul>
        </Section>

        <Section title="Stack">
          <p className="text-sm text-muted-foreground">
            React + TanStack Start server routes, Postgres for calls and leads, Lovable AI for
            reasoning, speech-to-text and text-to-speech, and Twilio for the phone channel. Model
            keys stay server-side; the browser only talks to this app's own endpoints.
          </p>
        </Section>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="panel-3d p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );

}
