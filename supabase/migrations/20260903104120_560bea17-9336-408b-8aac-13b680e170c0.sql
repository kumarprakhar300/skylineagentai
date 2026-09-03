GRANT INSERT ON public.leads TO authenticated;

DROP POLICY IF EXISTS "Staff can import leads" ON public.leads;
CREATE POLICY "Staff can import leads"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role));