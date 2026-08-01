import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, FileText, Languages, ShieldCheck, Sparkles } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { VoiceCall } from "@/components/VoiceCall";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getProjectCatalog } from "@/lib/catalog.functions";
import { leadsDefaultSearch } from "@/lib/leads-search";

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
  const { data: projects } = useSuspenseQuery(catalogQuery);
  const cityCount = new Set(projects.map((p) => p.city || p.location)).size;


  return (
    <main className="min-h-screen bg-background">
      <AppHeader />


      <section className="scene-3d relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 size-[26rem] rounded-full bg-primary/10 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="size-3.5" /> Live browser voice demo
            </Badge>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              An AI real estate sales executive that actually talks —{" "}
              <span className="text-primary">Hindi, Hinglish, English.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Aarav greets the customer, finds out whether they want to buy or invest, qualifies
              location, configuration, budget, purpose and timeline, answers questions about any
              of the five metro-city projects, then captures the lead and writes a call summary.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <Feature icon={<Languages className="size-3.5" />}>
                Mirrors the caller's language
              </Feature>
              <Feature icon={<Database className="size-3.5" />}>
                Every lead stored in the database
              </Feature>
              <Feature icon={<FileText className="size-3.5" />}>AI call summary on hang-up</Feature>
              <Feature icon={<ShieldCheck className="size-3.5" />}>
                No guaranteed-return claims
              </Feature>
            </div>
          </div>

          <div aria-hidden="true" className="hidden justify-center lg:flex">
            <div className="tower grid gap-4">
              {[
                { w: "13rem", h: "8rem", z: "0px", o: "0.95" },
                { w: "15rem", h: "9rem", z: "42px", o: "0.8" },
                { w: "11rem", h: "7rem", z: "84px", o: "0.65" },
              ].map((slab, index) => (
                <div
                  key={index}
                  className="tower-slab"
                  style={{
                    width: slab.w,
                    height: slab.h,
                    opacity: slab.o,
                    transform: `translateZ(${slab.z})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className="mx-auto max-w-6xl px-5 py-10">
        <VoiceCall />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/70">
              Sample inventory (fictional)
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {projects.length} projects across {cityCount} metro cities
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Aarav matches the customer's city first, then pitches the benefits that matter to
              them — entry price, possession date, commute and rental potential. Every figure below
              is demo data and is quoted as indicative on the call.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {projects.map((p) => (
              <Badge key={p.id ?? p.name} variant="secondary" className="font-medium">
                {p.city || p.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="scene-3d mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id ?? p.name} className="tilt-card glass-panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {p.city}
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold leading-tight">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.location}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[11px]">
                  {p.configurations.length} plans
                </Badge>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Detail label="Price band">{p.priceRange || "—"}</Detail>
                <Detail label="Possession">{p.possession || "—"}</Detail>
              </dl>

              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {p.configurations.slice(0, 4).map((c) => (
                  <li key={c.type} className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-foreground">{c.type}</span>
                    <span className="text-right tabular-nums">
                      {[c.carpet, c.price].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>

              {p.benefits.length > 0 && (
                <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-foreground/70">
                    Why customers pick it
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    {p.benefits.slice(0, 3).map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-4 line-clamp-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Nearby:</span>{" "}
                {p.locationAdvantages.slice(0, 3).join(" · ")}
              </p>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Amenities:</span>{" "}
                {p.amenities.slice(0, 4).join(", ")}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="scene-3d grid gap-6">


          <Card className="tilt-card glass-panel p-6">
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
              <Status ok>Staff sign-in, admin roles and row-level security on every lead record</Status>
              <Status>No CRM hand-off and no email / SMS follow-up yet</Status>
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
