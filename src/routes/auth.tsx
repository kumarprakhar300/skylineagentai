import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

function safePath(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/leads";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safePath(search["redirect"]),
  }),
  head: () => ({
    meta: [
      { title: "Staff Sign In — Skyline Estates AI Calling Agent" },
      {
        name: "description",
        content:
          "Sign in to the Skyline Estates sales console to review AI voice calls, transcripts, qualified leads and follow-ups.",
      },
      { property: "og:title", content: "Staff sign in" },
      {
        property: "og:description",
        content: "Sign in to review AI-qualified real estate leads, call transcripts and follow-ups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Auth,
});

function Auth() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: redirect, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void navigate({ to: redirect, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirect]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grain flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to the call demo
        </Link>

        <Card className="mt-4 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h1 className="text-lg font-semibold">Sales console sign in</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Call transcripts contain customer names and phone numbers, so the dashboard is only
            available to signed-in staff.
          </p>

          {checkEmail ? (
            <p className="mt-5 rounded-md bg-muted p-3 text-sm">
              Check <span className="font-medium">{email}</span> for a confirmation link, then sign
              in.
            </p>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full"
                onClick={handleGoogle}
                disabled={busy}
              >
                Continue with Google
              </Button>

              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="email" className="text-xs text-muted-foreground">
                    Work email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1.5"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-xs text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    className="mt-1.5"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  {mode === "signup" ? "Create staff account" : "Sign in"}
                </Button>
              </form>

              <button
                type="button"
                className="mt-4 w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin"
                  ? "No account yet? Create one"
                  : "Already have an account? Sign in"}
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                The first account created becomes the admin and can edit the project catalog.
              </p>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
