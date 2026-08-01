import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Metric strip placeholder — matches the live 4-up metric grid. */
export function MetricStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="panel-3d p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
        </Card>
      ))}
    </div>
  );
}

/** Filter bar placeholder — six controls plus the footer row. */
export function FilterBarSkeleton() {
  return (
    <Card className="panel-3d p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-9 w-full" />
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-9 w-full" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-10" />
              <Skeleton className="mt-2 h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </Card>
  );
}

/** One call/lead record placeholder, mirroring the two-column record layout. */
export function LeadCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <Card className="panel-3d p-6" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
      <Skeleton className="mt-5 h-24 w-full rounded-lg" />
    </Card>
  );
}

/** Full leads dashboard placeholder used as the route pending component. */
export function LeadsPageSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <>
      <MetricStripSkeleton />
      <FilterBarSkeleton />
      {Array.from({ length: rows }).map((_, index) => (
        <LeadCardSkeleton key={index} delay={index * 90} />
      ))}
    </>
  );
}

/** Horizontal bar chart placeholder with staggered bar widths. */
export function ChartSkeleton({
  bars = 4,
  title = true,
  className,
}: {
  bars?: number;
  title?: boolean;
  className?: string;
}) {
  const widths = ["82%", "64%", "48%", "36%", "28%", "20%"];
  return (
    <div className={cn("", className)}>
      {title && <Skeleton className="h-5 w-40" />}
      <ul className={cn("space-y-3", title && "mt-4")}>
        {Array.from({ length: bars }).map((_, index) => (
          <li key={index}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-6" />
            </div>
            <Skeleton
              className="mt-2 h-2 rounded-full"
              style={{ width: widths[index % widths.length] }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full analytics dashboard placeholder used as the route pending component. */
export function AnalyticsPageSkeleton() {
  return (
    <>
      <MetricStripSkeleton />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="panel-3d p-6">
          <ChartSkeleton bars={3} />
        </Card>
        <Card className="panel-3d p-6">
          <ChartSkeleton bars={5} />
        </Card>
      </div>
      <Card className="panel-3d p-6">
        <ChartSkeleton bars={4} />
      </Card>
    </>
  );
}

/** Catalog editor placeholder that mirrors the admin form blocks. */
export function CatalogFormSkeleton() {
  return (
    <>
      {[3, 2, 2].map((fields, block) => (
        <Card key={block} className="panel-3d p-6">
          <Skeleton className="h-5 w-44" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: fields * 2 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-9 w-full" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
