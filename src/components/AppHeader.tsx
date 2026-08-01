import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, LogIn, LogOut, Settings2, Table2 } from "lucide-react";

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
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
      >
        <Link to="/" className="font-serif text-base font-semibold tracking-tight">
          Skyline Estates <span className="text-muted-foreground">AI</span>
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link to="/docs">How it works</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/phone">Phone demo</Link>
          </Button>

          {session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/leads" search={leadsDefaultSearch}>
                  <Table2 className="size-4" /> Leads
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/analytics">
                  <BarChart3 className="size-4" /> Analytics
                </Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">
                    <Settings2 className="size-4" /> Catalog
                  </Link>
                </Button>
              )}
              <span className="hidden max-w-[14rem] truncate text-xs text-muted-foreground sm:inline">
                {email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" disabled={loading}>
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
