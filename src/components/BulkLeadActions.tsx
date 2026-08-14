import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCheck, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUSES } from "@/lib/leads-search";

type Props = {
  /** Call ids whose leads should be updated. */
  callIds: string[];
  /** Total rows currently visible, for the "select all" affordance. */
  visibleCount: number;
  onSelectAllVisible: () => void;
  onClear: () => void;
};

/** Follow-up presets: relative days from now, or null to clear the reminder. */
const FOLLOW_UPS = [
  { value: "today", label: "Follow up today", days: 0 },
  { value: "tomorrow", label: "Follow up tomorrow", days: 1 },
  { value: "3d", label: "Follow up in 3 days", days: 3 },
  { value: "week", label: "Follow up next week", days: 7 },
  { value: "clear", label: "Clear follow-up", days: null },
] as const;

function followUpAt(days: number | null): string | null {
  if (days === null) return null;
  const at = new Date();
  at.setDate(at.getDate() + days);
  at.setHours(10, 0, 0, 0);
  return at.toISOString();
}

export function BulkLeadActions({ callIds, visibleCount, onSelectAllVisible, onClear }: Props) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const count = callIds.length;

  const applyPatch = async (
    patch: { status?: string; callback_at?: string | null },
    label: string,
    key: string,
  ) => {
    if (count === 0) return;
    setBusy(key);
    const { error, count: updated } = await supabase
      .from("leads")
      .update(patch, { count: "exact" })
      .in("call_id", callIds);
    setBusy(null);
    if (error) {
      toast.error(`Could not update leads — ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-transcripts"] });
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    toast.success(`${label} · ${updated ?? count} lead${(updated ?? count) === 1 ? "" : "s"} updated`);
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3">
      <Badge variant="secondary" className="gap-1">
        <CheckCheck className="size-3" />
        {count} selected
      </Badge>

      <Select
        value=""
        disabled={count === 0 || busy !== null}
        onValueChange={(value) => {
          const label = LEAD_STATUSES.find((s) => s.value === value)?.label ?? value;
          void applyPatch({ status: value }, `Status set to ${label}`, "status");
        }}
      >
        <SelectTrigger className="h-9 w-full text-sm sm:w-48" aria-label="Set status for selected leads">
          <SelectValue placeholder="Set status…" />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value=""
        disabled={count === 0 || busy !== null}
        onValueChange={(value) => {
          const option = FOLLOW_UPS.find((f) => f.value === value);
          if (!option) return;
          void applyPatch({ callback_at: followUpAt(option.days) }, option.label, "callback");
        }}
      >
        <SelectTrigger className="h-9 w-full text-sm sm:w-52" aria-label="Mark selected leads for follow-up">
          <SelectValue placeholder="Mark for follow-up…" />
        </SelectTrigger>
        <SelectContent>
          {FOLLOW_UPS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              <span className="flex items-center gap-2">
                <CalendarClock className="size-3.5 text-muted-foreground" />
                {f.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onSelectAllVisible}>
          Select all {visibleCount} shown
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={onClear}
          disabled={count === 0}
        >
          <X className="size-3" /> Clear
        </Button>
      </div>
    </div>
  );
}
