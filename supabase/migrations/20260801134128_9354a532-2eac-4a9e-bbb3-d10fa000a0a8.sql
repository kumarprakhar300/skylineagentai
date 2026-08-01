-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- First account becomes admin, everyone after that is an agent.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 2. Lock down call + lead data to signed-in users only
DROP POLICY IF EXISTS "Demo: anyone can read calls" ON public.calls;
DROP POLICY IF EXISTS "Demo: anyone can read leads" ON public.leads;
REVOKE ALL ON public.calls FROM anon;
REVOKE ALL ON public.leads FROM anon;
GRANT SELECT ON public.calls TO authenticated;
GRANT SELECT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.calls TO service_role;
GRANT ALL ON public.leads TO service_role;

CREATE POLICY "Signed-in staff can read calls"
ON public.calls FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in staff can read leads"
ON public.leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in staff can update leads"
ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. Lead lifecycle
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS owner_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS callback_at timestamptz;

CREATE TABLE public.lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id uuid,
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lead_activity TO authenticated;
GRANT ALL ON public.lead_activity TO service_role;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in staff can read lead activity"
ON public.lead_activity FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in staff can add lead activity"
ON public.lead_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = actor_id);

CREATE INDEX IF NOT EXISTS lead_activity_lead_idx ON public.lead_activity (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_created_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS calls_started_idx ON public.calls (started_at DESC);