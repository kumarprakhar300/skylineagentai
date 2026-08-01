import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Buttons / links that help the user get unstuck. */
  action?: React.ReactNode;
  /** Render without the card chrome (for use inside an existing panel). */
  bare?: boolean;
  className?: string;
};

/**
 * Meaningful empty state: says what is missing, why, and what to do next.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  bare = false,
  className,
}: EmptyStateProps) {
  const body = (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      {icon && (
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-secondary/60 text-primary">
          {icon}
        </div>
      )}
      <p className={cn("font-medium", icon && "mt-4")}>{title}</p>
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );

  if (bare) return <div className={cn("py-8", className)}>{body}</div>;

  return <Card className={cn("panel-3d px-6 py-12", className)}>{body}</Card>;
}
