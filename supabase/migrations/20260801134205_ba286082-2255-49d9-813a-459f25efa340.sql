REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

DROP POLICY IF EXISTS "Signed-in staff can update leads" ON public.leads;
CREATE POLICY "Staff can update leads"
ON public.leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));