import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProjectCatalog } from "@/lib/agent/project";

type MappableProject = ProjectCatalog & { latitude: number; longitude: number };

declare global {
  interface Window {
    __skylineMapsReady?: boolean;
    __skylineMapsInit?: () => void;
    google?: any;
  }
}

const SCRIPT_ID = "skyline-google-maps";

/** Loads the Maps JS API once per page and resolves when it is fully initialised. */
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.__skylineMapsReady && window.google?.maps) return Promise.resolve();

  const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'] as
    | string
    | undefined;
  if (!key) return Promise.reject(new Error("Maps key missing"));

  const channel = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'] as
    | string
    | undefined;

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    const done = () => resolve();

    if (existing) {
      const poll = window.setInterval(() => {
        if (window.__skylineMapsReady && window.google?.maps) {
          window.clearInterval(poll);
          done();
        }
      }, 120);
      window.setTimeout(() => {
        window.clearInterval(poll);
        if (window.google?.maps) done();
        else reject(new Error("Maps did not load"));
      }, 12_000);
      return;
    }

    window.__skylineMapsInit = () => {
      window.__skylineMapsReady = true;
      done();
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&loading=async&callback=__skylineMapsInit` +
      (channel ? `&channel=${encodeURIComponent(channel)}` : "");
    script.onerror = () => reject(new Error("Maps script failed"));
    document.head.appendChild(script);
  });
}

export function ProjectMap({ projects }: { projects: ProjectCatalog[] }) {
  const mappable = useMemo(
    () =>
      projects.filter(
        (p): p is MappableProject =>
          typeof p.latitude === "number" && typeof p.longitude === "number",
      ),
    [projects],
  );

  const [activeId, setActiveId] = useState<string>(
    () => mappable[0]?.id ?? mappable[0]?.name ?? "",
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const infoRef = useRef<any>(null);

  const keyOf = (p: ProjectCatalog) => p.id ?? p.name;
  const active = mappable.find((p) => keyOf(p) === activeId) ?? mappable[0];

  useEffect(() => {
    let cancelled = false;
    if (mappable.length === 0) return;

    loadMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const g = window.google;
        const first = mappable[0]!;

        const map = new g.maps.Map(containerRef.current, {
          center: { lat: first.latitude, lng: first.longitude },
          zoom: first.mapZoom ?? 14,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });
        mapRef.current = map;
        infoRef.current = new g.maps.InfoWindow();

        for (const p of mappable) {
          const marker = new g.maps.Marker({
            map,
            position: { lat: p.latitude, lng: p.longitude },
            title: `${p.name} — ${p.location}`,
          });
          marker.addListener("click", () => setActiveId(keyOf(p)));
          markersRef.current[keyOf(p)] = marker;
        }
        setStatus("ready");
      })
      .catch((error) => {
        console.error("[map] load failed", error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappable.length]);

  // Pan and open the info window whenever the selected project changes.
  useEffect(() => {
    if (status !== "ready" || !active || !mapRef.current) return;
    const g = window.google;
    if (!g?.maps) return;

    const position = { lat: active.latitude, lng: active.longitude };
    mapRef.current.panTo(position);
    mapRef.current.setZoom(active.mapZoom ?? 15);

    const marker = markersRef.current[keyOf(active)];
    if (marker && infoRef.current) {
      infoRef.current.setContent(
        `<div style="font-family:inherit;max-width:220px">
           <strong>${escapeHtml(active.name)}</strong><br/>
           <span style="font-size:12px;color:#555">${escapeHtml(active.location)}</span><br/>
           <span style="font-size:12px;color:#555">${escapeHtml(active.priceRange || "")}</span>
         </div>`,
      );
      infoRef.current.open({ anchor: marker, map: mapRef.current });
    }
  }, [activeId, status, active]);

  if (mappable.length === 0) {
    return (
      <Card className="panel-3d p-6 text-sm text-muted-foreground">
        No project has map coordinates yet. Add latitude and longitude from the admin page to show
        the live location map.
      </Card>
    );
  }

  return (
    <Card className="panel-3d overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
        <MapPin className="size-4 text-primary" aria-hidden="true" />
        <p className="mr-2 text-sm font-semibold">Live location map</p>
        <div className="flex w-full gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
          {mappable.map((p) => {
            const id = keyOf(p);
            const selected = id === activeId;
            return (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className="shrink-0 text-xs"
                onClick={() => setActiveId(id)}
              >
                {p.city || p.name}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          role="application"
          aria-label="Map showing the live location of the selected project"
          className="h-[320px] w-full bg-secondary/40 sm:h-[420px]"
        />
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/60 text-sm text-muted-foreground">
            {status === "loading" ? "Loading live map…" : "Map could not be loaded right now."}
          </div>
        )}
      </div>

      {active && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{active.name}</h3>
              <Badge variant="secondary" className="text-[11px]">
                {active.city}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{active.location}</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${active.latitude},${active.longitude}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <Navigation className="mr-1.5 size-3.5" aria-hidden="true" />
              Directions
            </a>
          </Button>
        </div>
      )}
    </Card>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default ProjectMap;
