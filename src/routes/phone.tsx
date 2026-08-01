import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Phone } from "lucide-react";

import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/phone")({
  head: () => ({
    meta: [
      { title: "Phone Call Demo Setup (Twilio) — Skyline Estates AI Agent" },
      {
        name: "description",
        content:
          "How to point a Twilio number at this app so the same real estate AI agent can qualify buyers over a real phone call in Hindi, Hinglish or English.",
      },
      { property: "og:title", content: "Phone call demo setup (Twilio)" },
      {
        property: "og:description",
        content: "Connect a Twilio number to the AI real estate calling agent in two steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhonePage,
});

function PhonePage() {
  const webhook =
    typeof window === "undefined"
      ? "https://<your-app-url>/api/public/twilio/voice"
      : `${window.location.origin}/api/public/twilio/voice`;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to the call demo
        </Link>

        <h1 className="mt-4 flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Phone className="size-6 text-primary" /> Phone call demo
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The same agent brain also answers real phone calls through Twilio. The webhook below is
          live in this app — it greets the caller, qualifies the requirement over speech, saves the
          lead and writes the call summary, exactly like the browser demo.
        </p>

        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold">1. Point your Twilio number here</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            In the Twilio Console open <strong>Phone Numbers → your number → Voice</strong>, set
            “A call comes in” to <strong>Webhook</strong>, HTTP <strong>POST</strong>, and paste:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-secondary px-4 py-3 text-xs">
            {webhook}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">
            Publish the app first so the URL is publicly reachable.
          </p>
        </Card>

        <Card className="mt-5 p-6">
          <h2 className="text-lg font-semibold">2. Call the number</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aarav answers, speaks in Hinglish and switches to Hindi or English based on how you
            reply. Twilio's speech recognition transcribes each answer, the agent decides the next
            question, and the call ends politely once the requirement and contact details are
            captured. The record appears under{" "}
            <Link to="/leads" className="font-medium text-primary underline-offset-4 hover:underline">
              Leads &amp; calls
            </Link>{" "}
            with channel <em>phone</em>.
          </p>
        </Card>

        <Card className="mt-5 border-accent/40 bg-accent/10 p-6">
          <h2 className="text-lg font-semibold">Notes for the reviewer</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li>
              • Phone speech uses Twilio's built-in speech-to-text and Polly voices (Aditi for
              Hindi, Raveena for Indian English) so the round trip stays fast enough for a live
              call.
            </li>
            <li>
              • The browser demo uses AI speech-to-text and text-to-speech instead, which gives a
              more natural voice and supports mid-sentence interruption.
            </li>
            <li>
              • Outbound dialling is intentionally not automated — a real campaign needs consent and
              DND scrubbing, so the demo is inbound only.
            </li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
