DROP POLICY IF EXISTS "Signed-in staff can read calls" ON public.calls;
CREATE POLICY "Staff can read calls" ON public.calls FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

DROP POLICY IF EXISTS "Signed-in staff can read leads" ON public.leads;
CREATE POLICY "Staff can read leads" ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

DROP POLICY IF EXISTS "Signed-in staff can read lead activity" ON public.lead_activity;
CREATE POLICY "Staff can read lead activity" ON public.lead_activity FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

DROP POLICY IF EXISTS "Signed-in staff can add lead activity" ON public.lead_activity;
CREATE POLICY "Staff can add lead activity" ON public.lead_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = actor_id AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent')));

REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;