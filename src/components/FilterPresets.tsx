import { BookmarkPlus, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AdminSearch } from "@/lib/admin-search";
import {
  builtinPresets,
  describeFilters,
  filtersMatch,
  loadPresets,
  pickFilters,
  presetPatch,
  savePresets,
  type AdminPreset,
} from "@/lib/admin-presets";
import { cn } from "@/lib/utils";

type Props = {
  /** Current URL filter state. */
  current: AdminSearch;
  /** Apply a full filter set (clears keys the preset does not set). */
  onApply: (patch: AdminSearch) => void;
};

export function FilterPresets({ current, onApply }: Props) {
  const [saved, setSaved] = useState<AdminPreset[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  // localStorage is client-only, so hydrate after mount.
  useEffect(() => setSaved(loadPresets()), []);

  const presets = useMemo(() => [...builtinPresets(), ...saved], [saved]);
  const activeFilters = pickFilters(current);
  const hasFilters = Object.keys(activeFilters).length > 0;
  const activeId = presets.find((p) => filtersMatch(p.filters, activeFilters))?.id ?? null;

  const persist = (next: AdminPreset[]) => {
    setSaved(next);
    savePresets(next);
  };

  const addPreset = () => {
    const label = name.trim();
    if (!label || !hasFilters) return;
    const next = [
      ...saved.filter((p) => p.name.toLowerCase() !== label.toLowerCase()),
      { id: `p-${Date.now().toString(36)}`, name: label, filters: activeFilters },
    ];
    persist(next);
    setName("");
    setOpen(false);
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Presets
      </span>

      {presets.map((preset) => {
        const isActive = preset.id === activeId;
        return (
          <span
            key={preset.id}
            className={cn(
              "group inline-flex items-center gap-1 rounded-full border px-1 text-xs transition-colors",
              isActive
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground",
            )}
          >
            <button
              type="button"
              onClick={() => onApply(presetPatch(preset.filters))}
              title={describeFilters(preset.filters)}
              aria-pressed={isActive}
              className="inline-flex items-center gap-1 px-2 py-1"
            >
              {isActive ? <Check className="size-3" /> : null}
              {preset.name}
            </button>
            {preset.builtin ? null : (
              <button
                type="button"
                aria-label={`Delete preset ${preset.name}`}
                onClick={() => persist(saved.filter((p) => p.id !== preset.id))}
                className="rounded-full p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={!hasFilters}>
            <BookmarkPlus className="size-3.5" />
            Save current
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-2">
          <p className="text-xs text-muted-foreground">{describeFilters(activeFilters)}</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addPreset();
            }}
            placeholder="Preset name"
            aria-label="Preset name"
            className="h-8 text-sm"
          />
          <Button size="sm" className="h-8 w-full text-xs" onClick={addPreset} disabled={!name.trim()}>
            Save preset
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
