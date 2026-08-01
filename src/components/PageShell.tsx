import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { cn } from "@/lib/utils";

type PageShellProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Content column width. */
  width?: "narrow" | "wide";
  /** Render the shared app header (authenticated pages). */
  header?: boolean;
  /** Show a "back to the call demo" link instead of the header. */
  backLink?: boolean;
};

/**
 * Shared page frame: consistent depth backdrop, heading typography and
 * vertical rhythm across every dashboard and content page.
 */
export function PageShell({
  eyebrow,
  title,
  description,
  children,
  width = "wide",
  header = true,
  backLink = false,
}: PageShellProps) {
  return (
    <main className="scene-3d relative min-h-screen bg-background">
      <div aria-hidden="true" className="page-aura" />
      {header && <AppHeader />}
      <div
        className={cn(
          "relative mx-auto w-full px-4 pb-14 pt-6 sm:px-5 sm:pb-16 sm:pt-10",
          width === "narrow" ? "max-w-3xl" : "max-w-6xl",
        )}
      >
        {backLink && (
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to the call demo
          </Link>
        )}
        <header className={cn(backLink && "mt-4")}>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 text-[1.6rem] font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2.5 max-w-2xl text-[0.9rem] leading-relaxed text-muted-foreground sm:text-sm">
              {description}
            </p>
          )}
        </header>
        <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">{children}</div>
      </div>
    </main>
  );
}
