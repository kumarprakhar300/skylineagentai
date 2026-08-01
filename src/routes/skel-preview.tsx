import { createFileRoute } from "@tanstack/react-router";
import { PhoneCall } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { LeadsPageSkeleton, AnalyticsPageSkeleton } from "@/components/Skeletons";
export const Route = createFileRoute("/skel-preview")({
  component: () => (
    <main className="mx-auto max-w-6xl space-y-5 p-8">
      <LeadsPageSkeleton rows={1} />
      <AnalyticsPageSkeleton />
      <EmptyState icon={<PhoneCall className="size-5" />} title="No calls recorded yet" description="Run a call on the demo page and hang up." />
    </main>
  ),
});
