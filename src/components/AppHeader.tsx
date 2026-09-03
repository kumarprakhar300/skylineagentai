import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, KanbanSquare, LogIn, LogOut, Settings2, Table2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppSession } from "@/hooks/useAppSession";
import { supabase } from "@/integrations/supabase/client";
import { leadsDefaultSearch } from "@/lib/leads-search";

/** Session-aware nav. Renders the same on every page so sign-in state is obvious. */
export function AppHeader() {
  const { session, email, isAdmin, loading } = useAppSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", search: { redirect: "/leads" }, replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-5 sm:py-3"
      >
        <Link to="/" className="min-w-0 truncate font-serif text-sm font-semibold tracking-tight sm:text-base">
          Skyline Estates <span className="text-muted-foreground">AI</span>
        </Link>

        <div className="-mx-1 col-span-2 flex items-center gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:col-span-1 sm:mx-0 sm:ml-auto sm:flex-wrap sm:overflow-visible sm:px-0">
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to="/docs">How it works</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to="/phone">Phone demo</Link>
          </Button>

          {session ? (
            <>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link to="/leads" search={leadsDefaultSearch}>
                  <Table2 className="size-4" /> Leads
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link to="/pipeline">
                  <KanbanSquare className="size-4" /> Pipeline
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link to="/import">
                  <Upload className="size-4" /> Import
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link to="/analytics">
                  <BarChart3 className="size-4" /> Analytics
                </Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm" className="shrink-0">
                  <Link to="/admin">
                    <Settings2 className="size-4" /> Catalog
                  </Link>
                </Button>
              )}
              <span className="hidden max-w-[14rem] truncate text-xs text-muted-foreground sm:inline">
                {email}
              </span>
              <Button variant="outline" size="sm" className="shrink-0" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="shrink-0" disabled={loading}>
              <Link to="/auth" search={{ redirect: "/leads" }}>
                <LogIn className="size-4" /> Staff sign in
              </Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
