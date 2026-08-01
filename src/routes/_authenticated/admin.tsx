import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { defaultProject, type Configuration, type ProjectCatalog } from "@/lib/agent/project";
import { loadCatalogForEditing, saveProjectCatalog } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Edit Project Catalog — Skyline Estates AI Agent Admin" },
      {
        name: "description",
        content:
          "Admin editor for the demo real estate catalog: amenities, configurations, pricing and possession timeline — updated live without redeploying.",
      },
      { property: "og:title", content: "Edit the project catalog" },
      {
        property: "og:description",
        content:
          "Update the AI calling agent's project knowledge — pricing, configurations, amenities and possession — instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      eyebrow="Knowledge base"
      title="Project catalog"
      description="Everything the AI agent knows about the project lives here. Saving updates the agent's knowledge on the very next call — no redeploy needed."
      width="narrow"
    >
      {children}
    </PageShell>
  );
}


function Admin() {
  const load = useServerFn(loadCatalogForEditing);
  const save = useServerFn(saveProjectCatalog);

  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ProjectCatalog>(defaultProject);

  useEffect(() => {
    let active = true;
    void load({ data: undefined })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setState("denied");
          return;
        }
        setDraft(result.catalog);
        setState("ready");
      })
      .catch(() => active && setState("denied"));
    return () => {
      active = false;
    };
  }, [load]);

  async function handleSave() {
    setBusy(true);
    try {
      const result = await save({ data: { catalog: draft } });
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

  if (state === "loading") {
    return (
      <Shell>
        <CatalogFormSkeleton />
      </Shell>
    );
  }


  if (state === "denied") {
    return (
      <Shell>
        <Card className="panel-3d max-w-md p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            <p className="font-medium">Admin access required</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in but does not hold the admin role, so it cannot change what the
            AI agent tells customers. The first account created in this workspace is the admin.
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card className="panel-3d p-6">
        <h2 className="text-lg font-semibold tracking-tight">Project basics</h2>
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
          <Label htmlFor="payment-note" className="text-xs text-muted-foreground">
            Payment / loan note
          </Label>
          <Textarea
            id="payment-note"
            className="mt-1.5"
            rows={3}
            value={draft.paymentNote}
            onChange={(e) => set("paymentNote", e.target.value)}
          />
        </div>
      </Card>

      <Card className="panel-3d p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Configurations &amp; pricing</h2>
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
                aria-label={`Configuration ${index + 1} type`}
                onChange={(e) => setConfig(index, { type: e.target.value })}
              />
              <Input
                value={config.carpet}
                placeholder="1,050 sq ft"
                aria-label={`Configuration ${index + 1} carpet area`}
                onChange={(e) => setConfig(index, { carpet: e.target.value })}
              />
              <Input
                value={config.price}
                placeholder="1.15 crore – 1.4 crore"
                aria-label={`Configuration ${index + 1} price`}
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

      <Card className="panel-3d p-6">
        <h2 className="text-lg font-semibold tracking-tight">Amenities</h2>
        <p className="mt-1 text-xs text-muted-foreground">One amenity per line.</p>
        <Textarea
          className="mt-3"
          rows={8}
          aria-label="Amenities, one per line"
          value={draft.amenities.join("\n")}
          onChange={(e) => set("amenities", e.target.value.split("\n"))}
        />
      </Card>

      <Card className="panel-3d p-6">
        <h2 className="text-lg font-semibold tracking-tight">Location advantages</h2>
        <p className="mt-1 text-xs text-muted-foreground">One advantage per line.</p>
        <Textarea
          className="mt-3"
          rows={6}
          aria-label="Location advantages, one per line"
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
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={id} className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
