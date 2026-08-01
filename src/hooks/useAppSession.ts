import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppSession = {
  loading: boolean;
  session: Session | null;
  email: string | null;
  isAdmin: boolean;
};

/**
 * Session + staff role for UI purposes only. Route access is enforced by the
 * `_authenticated` layout and every privileged write is re-checked server side.
 */
export function useAppSession(): AppSession {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (!next) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("has_role", {
        _user_id: next.user.id,
        _role: "admin",
      });
      if (!active) return;
      setIsAdmin(data === true);
      setLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => load(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "TOKEN_REFRESHED") return;
      void load(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    loading,
    session,
    email: session?.user.email ?? null,
    isAdmin,
  };
}
