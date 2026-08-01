import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { leadsDefaultSearch } from "@/lib/leads-search";

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
    <PageShell
      eyebrow="Channel"
      title={
        <span className="flex items-center gap-2">
          <Phone className="size-6 text-primary" /> Phone call demo
        </span>
      }
      description="The same agent brain also answers real phone calls through Twilio. The webhook below is live in this app — it greets the caller, qualifies the requirement over speech, saves the lead and writes the call summary, exactly like the browser demo."
      width="narrow"
      header={false}
      backLink
    >
        <Card className="panel-3d p-6">

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

        <Card className="panel-3d p-6">
          <h2 className="text-lg font-semibold">2. Call the number</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The agent answers, speaks in Hinglish and switches to Hindi or English based on how you
            reply. Twilio's speech recognition transcribes each answer, the agent decides the next
            question, and the call ends politely once the requirement and contact details are
            captured. The record appears under{" "}
            <Link to="/leads"
              search={leadsDefaultSearch} className="font-medium text-primary underline-offset-4 hover:underline">
              Leads &amp; calls
            </Link>{" "}
            with channel <em>phone</em>.
          </p>
        </Card>

        <Card className="panel-3d border-accent/40 bg-accent/10 p-6">
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

        <Card className="panel-3d border-destructive/30 p-6">
          <h2 className="text-lg font-semibold">3. Add your Twilio Auth Token</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The webhook cryptographically verifies that each request really comes from Twilio, so
            no one can forge calls. To enable it, copy your <strong>Auth Token</strong> from the
            Twilio Console (Console dashboard → <em>Account SID & Auth Token</em>) and save it
            as a secret named <code className="rounded bg-secondary px-1 py-0.5">TWILIO_AUTH_TOKEN</code> in
            your project's secret settings. Until it is set, the webhook rejects all phone calls
            for safety.
          </p>
        </Card>
    </PageShell>

  );
}
