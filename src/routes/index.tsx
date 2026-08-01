import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { leadsDefaultSearch } from "@/routes/leads";
import { Building2, Database, FileText, Languages, ShieldCheck, Sparkles } from "lucide-react";

import { VoiceCall } from "@/components/VoiceCall";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getProjectCatalog } from "@/lib/catalog.functions";

const catalogQuery = queryOptions({
  queryKey: ["project-catalog"],
  queryFn: () => getProjectCatalog(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skyline Estates AI Calling Agent — Hindi & Hinglish Voice Demo" },
      {
        name: "description",
        content:
          "Live browser voice demo of a real estate AI sales executive that qualifies buyers in Hindi, Hinglish and English, captures leads and generates a call summary.",
      },
      { property: "og:title", content: "Skyline Estates AI Calling Agent" },
      {
        property: "og:description",
        content:
          "An AI real estate sales executive that talks in Hindi, Hinglish and English, qualifies requirements and stores every lead.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQuery);
  },
  component: Index,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-2xl px-5 py-16 text-sm">
      Could not load the demo page: {error instanceof Error ? error.message : "unknown error"}
    </main>
  ),
  notFoundComponent: () => <main className="px-5 py-16">Page not found.</main>,
});

function Index() {
  const { data: project } = useSuspenseQuery(catalogQuery);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-secondary/40 grain">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Skyline Estates</p>
              <p className="text-xs text-muted-foreground">AI calling agent · demo</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/leads"
              search={leadsDefaultSearch}
              className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-secondary"
            >
              Leads &amp; calls
            </Link>
            <Link
              to="/docs"
              className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-secondary"
            >
              How it works
            </Link>
            <Link
              to="/admin"
              className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-secondary"
            >
              Edit catalog
            </Link>
            <Link
              to="/phone"
              className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-secondary"
            >
              Phone call
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-12">
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="size-3.5" /> Live browser voice demo
        </Badge>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          An AI real estate sales executive that actually talks —{" "}
          <span className="text-primary">Hindi, Hinglish, English.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Aarav greets the customer, finds out whether they want to buy or invest, qualifies
          location, configuration, budget, purpose and timeline, answers questions about the sample
          project, then captures the lead and writes a call summary.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <Feature icon={<Languages className="size-3.5" />}>Mirrors the caller's language</Feature>
          <Feature icon={<Database className="size-3.5" />}>Every lead stored in the database</Feature>
          <Feature icon={<FileText className="size-3.5" />}>AI call summary on hang-up</Feature>
          <Feature icon={<ShieldCheck className="size-3.5" />}>No guaranteed-return claims</Feature>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <VoiceCall />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/70">
              Sample project (fictional)
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{project.name}</h2>
            <p className="text-sm text-muted-foreground">{project.location}</p>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Configurations">
                {project.configurations.map((c) => c.type).join(" · ")}
              </Detail>
              <Detail label="Indicative price">{project.priceRange}</Detail>
              <Detail label="Possession">{project.possession}</Detail>
              <Detail label="Developer">{project.developer}</Detail>
            </dl>

            <div className="mt-5 space-y-3 text-sm">
              <div>
                <p className="font-medium">Key amenities</p>
                <p className="text-muted-foreground">{project.amenities.join(", ")}</p>
              </div>
              <div>
                <p className="font-medium">Location advantages</p>
                <p className="text-muted-foreground">{project.locationAdvantages.join(", ")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold">Functional vs simulated</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <Status ok>
                Browser voice conversation: real speech-to-text, real AI reasoning, real
                text-to-speech
              </Status>
              <Status ok>Language detection and Hindi / Hinglish / English replies</Status>
              <Status ok>Requirement qualification and lead extraction each turn</Status>
              <Status ok>Lead + transcript + AI summary written to the database</Status>
              <Status ok>
                Phone calls over Twilio — code is live, needs your Twilio number to dial out
              </Status>
              <Status>
                The project itself is fictional: prices, RERA details and possession dates are demo
                values
              </Status>
              <Status>No CRM hand-off, no email/SMS follow-up, no authentication in this demo</Status>
            </ul>
          </Card>
        </div>
      </section>

      <footer className="border-t bg-secondary/40 px-5 py-6 text-center text-xs text-muted-foreground">
        Interview demo build. Fictional project data only — no confidential or company-owned
        information is used.
      </footer>
    </main>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 font-medium">
      {icon}
      {children}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

function Status({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        className={
          ok
            ? "mt-1.5 size-2 shrink-0 rounded-full bg-primary"
            : "mt-1.5 size-2 shrink-0 rounded-full bg-accent"
        }
      />
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}
