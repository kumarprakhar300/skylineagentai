import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Lock, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultProject, type Configuration, type ProjectCatalog } from "@/lib/agent/project";
import { saveProjectCatalog, unlockProjectCatalog } from "@/lib/catalog.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Edit Project Catalog — Skyline Estates AI Agent Admin" },
      {
        name: "description",
        content:
          "Passcode-protected admin editor for the demo real estate catalog: amenities, configurations, pricing and possession timeline — updated live without redeploying.",
      },
      { property: "og:title", content: "Edit the project catalog" },
      {
        property: "og:description",
        content: "Update the AI calling agent's project knowledge — pricing, configurations, amenities and possession — instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Admin,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to the call demo
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Project catalog</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Everything the AI agent knows about the project lives here. Saving updates the agent's
          knowledge on the very next call — no redeploy needed.
        </p>
        <div className="mt-8 space-y-5">{children}</div>
      </div>
    </main>
  );
}

function Admin() {
  const unlock = useServerFn(unlockProjectCatalog);
  const save = useServerFn(saveProjectCatalog);

  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ProjectCatalog>(defaultProject);

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await unlock({ data: { passcode } });
      if (!result.ok) {
        toast.error("Incorrect passcode");
        return;
      }
      setDraft(result.catalog);
      setUnlocked(true);
    } catch {
      toast.error("Could not verify the passcode");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setBusy(true);
    try {
      const result = await save({ data: { passcode, catalog: draft } });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save");
        return;
      }
      toast.success("Catalog updated — the agent uses it from the next call");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the catalog");
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof ProjectCatalog>(key: K, value: ProjectCatalog[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const setConfig = (index: number, patch: Partial<Configuration>) =>
    setDraft((prev) => ({
      ...prev,
      configurations: prev.configurations.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  if (!unlocked) {
    return (
      <Shell>
        <Card className="max-w-md p-6">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <p className="font-medium">Admin passcode required</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            The passcode is stored as a server-side secret and never reaches the browser bundle.
          </p>
          <form onSubmit={handleUnlock} className="mt-4 space-y-3">
            <Input
              type="password"
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin passcode"
            />
            <Button type="submit" disabled={busy || passcode.length === 0}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Unlock editor
            </Button>
          </form>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Project basics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Project name" value={draft.name} onChange={(v) => set("name", v)} />
          <Field label="Developer" value={draft.developer} onChange={(v) => set("developer", v)} />
          <Field label="Location" value={draft.location} onChange={(v) => set("location", v)} />
          <Field label="Status" value={draft.status} onChange={(v) => set("status", v)} />
          <Field
            label="Indicative price range"
            value={draft.priceRange}
            onChange={(v) => set("priceRange", v)}
          />
          <Field
            label="Possession timeline"
            value={draft.possession}
            onChange={(v) => set("possession", v)}
          />
          <Field label="RERA note" value={draft.reraNote} onChange={(v) => set("reraNote", v)} />
          <Field
            label="Site visit note"
            value={draft.siteVisitNote}
            onChange={(v) => set("siteVisitNote", v)}
          />
        </div>
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Payment / loan note</Label>
          <Textarea
            className="mt-1.5"
            rows={3}
            value={draft.paymentNote}
            onChange={(e) => set("paymentNote", e.target.value)}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Configurations &amp; pricing</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set("configurations", [...draft.configurations, { type: "", carpet: "", price: "" }])
            }
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {draft.configurations.length === 0 && (
            <p className="text-sm text-muted-foreground">No configurations yet.</p>
          )}
          {draft.configurations.map((config, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
              <Input
                value={config.type}
                placeholder="3 BHK"
                onChange={(e) => setConfig(index, { type: e.target.value })}
              />
              <Input
                value={config.carpet}
                placeholder="1,050 sq ft"
                onChange={(e) => setConfig(index, { carpet: e.target.value })}
              />
              <Input
                value={config.price}
                placeholder="1.15 crore – 1.4 crore"
                onChange={(e) => setConfig(index, { price: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove configuration ${index + 1}`}
                onClick={() =>
                  set(
                    "configurations",
                    draft.configurations.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Amenities</h2>
        <p className="mt-1 text-xs text-muted-foreground">One amenity per line.</p>
        <Textarea
          className="mt-3"
          rows={8}
          value={draft.amenities.join("\n")}
          onChange={(e) => set("amenities", e.target.value.split("\n"))}
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Location advantages</h2>
        <p className="mt-1 text-xs text-muted-foreground">One advantage per line.</p>
        <Textarea
          className="mt-3"
          rows={6}
          value={draft.locationAdvantages.join("\n")}
          onChange={(e) => set("locationAdvantages", e.target.value.split("\n"))}
        />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save catalog
        </Button>
        <Button variant="ghost" onClick={() => setDraft(defaultProject)} disabled={busy}>
          Reset to demo defaults
        </Button>
      </div>
    </Shell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
