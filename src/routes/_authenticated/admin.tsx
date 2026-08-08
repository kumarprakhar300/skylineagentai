import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { CatalogFormSkeleton } from "@/components/Skeletons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { defaultProjects, type Configuration, type ProjectCatalog } from "@/lib/agent/project";
import {
  deleteProjectFromCatalog,
  loadCatalogForEditing,
  saveProjectCatalog,
} from "@/lib/catalog.functions";

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
      description="Every project the AI agent can pitch lives here — one per metro city. Saving updates the agent's knowledge on the very next call, no redeploy needed."
      width="narrow"
    >
      {children}
    </PageShell>
  );
}


function Admin() {
  const load = useServerFn(loadCatalogForEditing);
  const save = useServerFn(saveProjectCatalog);
  const remove = useServerFn(deleteProjectFromCatalog);

  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<ProjectCatalog[]>(defaultProjects);
  const [selected, setSelected] = useState(0);

  const reload = useCallback(async () => {
    const result = await load({ data: undefined });
    if (!result.ok) {
      setState("denied");
      return;
    }
    setProjects(result.projects.length > 0 ? result.projects : defaultProjects);
    setState("ready");
  }, [load]);

  useEffect(() => {
    let active = true;
    void reload().catch(() => active && setState("denied"));
    return () => {
      active = false;
    };
  }, [reload]);

  const draft = projects[Math.min(selected, projects.length - 1)] ?? defaultProjects[0]!;

  async function handleSave() {
    setBusy(true);
    try {
      const result = await save({ data: { catalog: draft } });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save");
        return;
      }
      toast.success(`${draft.name} updated — the agent uses it from the next call`);
      if (!draft.id) await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the project");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!draft.id) {
      setProjects((prev) => prev.filter((_, i) => i !== selected));
      setSelected(0);
      return;
    }
    setBusy(true);
    try {
      const result = await remove({ data: { id: draft.id } });
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete");
        return;
      }
      toast.success(`${draft.name} removed from the catalog`);
      setSelected(0);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the project");
    } finally {
      setBusy(false);
    }
  }

  function addProject() {
    setProjects((prev) => [
      ...prev,
      {
        city: "",
        name: "New project",
        developer: "Skyline Estates (demo developer)",
        location: "",
        status: "",
        reraNote: "RERA number is a placeholder in this demo build",
        priceRange: "",
        possession: "",
        paymentNote: "",
        siteVisitNote: "",
        configurations: [],
        amenities: [],
        locationAdvantages: [],
        benefits: [],
        sortOrder: (prev.length + 1) * 10,
      },
    ]);
    setSelected(projects.length);
  }

  const set = <K extends keyof ProjectCatalog>(key: K, value: ProjectCatalog[K]) =>
    setProjects((prev) => prev.map((p, i) => (i === selected ? { ...p, [key]: value } : p)));

  const setConfig = (index: number, patch: Partial<Configuration>) =>
    setProjects((prev) =>
      prev.map((p, i) =>
        i === selected
          ? {
              ...p,
              configurations: p.configurations.map((c, ci) =>
                ci === index ? { ...c, ...patch } : c,
              ),
            }
          : p,
      ),
    );

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
        <Card className="panel-3d max-w-md p-4 sm:p-6">
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
      <Card className="panel-3d p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">Captured leads</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download every captured lead with its call summary, or the full turn-by-turn
              transcripts, as a spreadsheet-ready CSV.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={exporting !== null}
              onClick={() => void handleExport("leads")}
            >
              {exporting === "leads" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}{" "}
              Leads CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting !== null}
              onClick={() => void handleExport("transcripts")}
            >
              {exporting === "transcripts" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}{" "}
              Transcripts CSV
            </Button>
          </div>
        </div>
      </Card>

      <Card className="panel-3d p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            Projects ({projects.length})
          </h2>
          <Button variant="outline" size="sm" onClick={addProject}>
            <Plus className="size-4" /> Add project
          </Button>
        </div>

        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {projects.map((p, i) => (
            <Button
              key={p.id ?? `${p.name}-${i}`}
              size="sm"
              variant={i === selected ? "default" : "outline"}
              className="shrink-0"
              onClick={() => setSelected(i)}
            >
              {p.city || p.name || "Untitled"}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="panel-3d p-4 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Project basics</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Field label="Metro city" value={draft.city} onChange={(v) => set("city", v)} />
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
          <Field
            label="Map latitude"
            value={draft.latitude === undefined ? "" : String(draft.latitude)}
            onChange={(v) => {
              const n = Number(v);
              set("latitude", v.trim() === "" || Number.isNaN(n) ? undefined : n);
            }}
          />
          <Field
            label="Map longitude"
            value={draft.longitude === undefined ? "" : String(draft.longitude)}
            onChange={(v) => {
              const n = Number(v);
              set("longitude", v.trim() === "" || Number.isNaN(n) ? undefined : n);
            }}
          />
          <Field
            label="Map zoom (1-21)"
            value={draft.mapZoom === undefined ? "" : String(draft.mapZoom)}
            onChange={(v) => {
              const n = Number.parseInt(v, 10);
              set("mapZoom", Number.isNaN(n) ? undefined : Math.min(21, Math.max(1, n)));
            }}
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

      <Card className="panel-3d p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">Configurations &amp; pricing</h2>
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
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:rounded-none sm:border-0 sm:p-0"
            >
              <Input
                className="col-span-2 sm:col-span-1"
                value={config.type}
                placeholder="3 BHK"
                aria-label={`Configuration ${index + 1} type`}
                onChange={(e) => setConfig(index, { type: e.target.value })}
              />
              <Input
                className="col-span-2 sm:col-span-1"
                value={config.carpet}
                placeholder="1,050 sq ft"
                aria-label={`Configuration ${index + 1} carpet area`}
                onChange={(e) => setConfig(index, { carpet: e.target.value })}
              />
              <Input
                className="col-span-2 sm:col-span-1"
                value={config.price}
                placeholder="1.15 crore – 1.4 crore"
                aria-label={`Configuration ${index + 1} price`}
                onChange={(e) => setConfig(index, { price: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="col-span-2 justify-self-end sm:col-span-1"
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

      <Card className="panel-3d p-4 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Amenities</h2>
        <p className="mt-1 text-xs text-muted-foreground">One amenity per line.</p>
        <Textarea
          className="mt-3"
          rows={8}
          aria-label="Amenities, one per line"
          value={draft.amenities.join("\n")}
          onChange={(e) => set("amenities", e.target.value.split("\n"))}
        />
      </Card>

      <Card className="panel-3d p-4 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Location advantages</h2>
        <p className="mt-1 text-xs text-muted-foreground">One advantage per line.</p>
        <Textarea
          className="mt-3"
          rows={6}
          aria-label="Location advantages, one per line"
          value={draft.locationAdvantages.join("\n")}
          onChange={(e) => set("locationAdvantages", e.target.value.split("\n"))}
        />
      </Card>

      <Card className="panel-3d p-4 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Customer benefits</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          One benefit per line. The agent uses these to pitch value — savings, commute, possession,
          rental potential — instead of reading out amenities.
        </p>
        <Textarea
          className="mt-3"
          rows={6}
          aria-label="Customer benefits, one per line"
          value={draft.benefits.join("\n")}
          onChange={(e) => set("benefits", e.target.value.split("\n"))}
        />
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <Button className="w-full sm:w-auto" onClick={handleSave} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save {draft.city || draft.name}
        </Button>
        <Button
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={() => void reload()}
          disabled={busy}
        >
          Discard changes
        </Button>
        <Button
          variant="ghost"
          className="w-full text-destructive sm:ml-auto sm:w-auto"
          onClick={() => void handleDelete()}
          disabled={busy || projects.length <= 1}
        >
          <Trash2 className="size-4" /> Delete project
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
